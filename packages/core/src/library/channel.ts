import _ from 'lodash';
import {
  Default,
  Dict,
  Intersection,
  KeyOfValueWithType,
  OptionalizeUndefined,
  ValueWithType,
} from 'tslang';

import {IChannelQueue} from './channel-queue';
import {SignalMessage, SignalMessageData, SignalName} from './signal';

export class MessageTemplatePlaceholder<
  T = unknown,
  TRequired extends boolean = boolean
> {
  protected _type!: T;
  protected _required!: TRequired;

  readonly default: T;

  constructor(defaultValue: T) {
    this.default = defaultValue;
  }
}

export function placeholder<T>(): MessageTemplatePlaceholder<T, true>;
export function placeholder<T>(
  defaultValue: T,
): MessageTemplatePlaceholder<T, false>;
export function placeholder(
  defaultValue?: unknown,
): MessageTemplatePlaceholder {
  return new MessageTemplatePlaceholder(defaultValue);
}

export type MessageTemplateFunction = (data: object, type: string) => unknown;

export type MessageTemplateDefinition = Dict<unknown>;

export type MessageTemplateDefinitionDict = Dict<MessageTemplateDefinition>;

export interface ChannelSendOptions {}

type __ChannelSendParamsDataSection<TData> = {} extends TData
  ? {data?: TData}
  : {data: TData};

type __MessageTemplateFunctionSourceData<
  TMessageTemplateFunction
> = TMessageTemplateFunction extends MessageTemplateFunction
  ? Default<Exclude<Parameters<TMessageTemplateFunction>[0], undefined>, {}>
  : never;

type __MessageTemplatePlaceholderSourceData<
  TMessageTemplateDefinition extends object
> = OptionalizeUndefined<
  {
    [TKey in KeyOfValueWithType<
      TMessageTemplateDefinition,
      MessageTemplatePlaceholder
    >]: TMessageTemplateDefinition[TKey] extends MessageTemplatePlaceholder<
      infer T,
      infer TRequired
    >
      ? TRequired extends true
        ? T
        : T | undefined
      : never;
  }
>;

type __ChannelSendParamsData<
  TMessageTemplateDefinition
> = TMessageTemplateDefinition extends MessageTemplateDefinition
  ? Intersection<
      | __MessageTemplateFunctionSourceData<
          ValueWithType<TMessageTemplateDefinition, MessageTemplateFunction>
        >
      | __MessageTemplatePlaceholderSourceData<TMessageTemplateDefinition>
    >
  : {};

type __ChannelSendParamsTypeAndDataSection<
  TDefinitionDict extends MessageTemplateDefinitionDict,
  TType extends keyof TDefinitionDict
> = TType extends string
  ? __ChannelSendParamsDataSection<
      __ChannelSendParamsData<TDefinitionDict[TType]>
    > & {type: TType}
  : never;

export type ChannelSendParamsType<
  TTarget,
  TDefinitionDict extends MessageTemplateDefinitionDict
> = ChannelSendParams<TTarget> &
  __ChannelSendParamsTypeAndDataSection<TDefinitionDict, keyof TDefinitionDict>;

interface ChannelSendParams<TTarget> {
  type: string;
  targets: TTarget[];
  options?: ChannelSendOptions;
  data?: Dict<unknown>;
}

abstract class Channel<
  TTarget,
  TDefinitionDict extends MessageTemplateDefinitionDict
> {
  constructor(
    definitionDict: TDefinitionDict,
    queue: IChannelQueue<TTarget>,
    firstSignalName: string,
  );
  constructor(
    private definitionDict: MessageTemplateDefinitionDict,
    private queue: IChannelQueue<TTarget>,
    private firstSignalName: SignalName,
  ) {}

  async send(
    params: ChannelSendParamsType<TTarget, TDefinitionDict>,
  ): Promise<SignalMessage[]>;
  async send({
    type,
    targets,
    data = {},
  }: ChannelSendParams<TTarget>): Promise<SignalMessage[]> {
    if (!targets.length) {
      return [];
    }

    let definition = this.definitionDict[type];

    if (typeof definition === 'boolean') {
      definition = {};
    }

    let templateData = _.mapValues(definition, (origin, key) => {
      if (origin instanceof MessageTemplatePlaceholder) {
        let value = data[key];
        return value === undefined ? origin.default : value;
      }

      switch (typeof origin) {
        case 'function':
          return (origin as MessageTemplateFunction)(data, type);
        default:
          return origin;
      }
    });

    let messages = await this.addMessages(
      {
        type,
        data: templateData,
      },
      targets,
    );

    let firstSignalName = this.firstSignalName;

    for (let target of targets) {
      await this.queue.queueSignal(target, firstSignalName, 0);
    }

    return messages;
  }

  protected abstract addMessages(
    data: SignalMessageData,
    targets: TTarget[],
  ): Promise<SignalMessage[]>;
}

export const AbstractChannel = Channel;

export interface IChannel<
  TTarget,
  TDefinitionDict extends MessageTemplateDefinitionDict
> extends Channel<TTarget, TDefinitionDict> {}

// const definitionDict = {
//   foo: {
//     yoha: true,
//     ppp: placeholder<number>(),
//     hello: ({}: {foo: string}): string => '',
//     helloX: ({}: {bar: number}): string => '',
//   },
//   bar: {},
// } as const;

// class XChannel extends Channel<object, typeof definitionDict> {}

// // let x = new Channel<object, typeof definitionDict>(definitionDict, []);
// let x!: XChannel;

// x.send({
//   type: 'foo',
//   targets: [],
//   data: {
//     ppp: 1,
//     foo: '',
//     bar: 123,
//   },
// }).catch();

// x.send({
//   type: 'bar',
//   targets: [],
// }).catch();
