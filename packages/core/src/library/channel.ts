import _ from 'lodash';
import {Dict, Intersection, KeyOfValueWithType, ValueWithType} from 'tslang';

import {IChannelQueue} from './channel-queue';
import {SignalMessageData, SignalMessageId} from './signal';

export type MessageTemplateFunction = (data: object) => string;

export type MessageTemplateDefinition = Dict<MessageTemplateFunction | true>;

export type MessageTemplateDefinitionDict = Dict<
  MessageTemplateDefinition | true
>;

export interface ChannelSendOptions {}

type __ChannelSendParamsDataSection<TData extends object> = {} extends TData
  ? {data?: TData}
  : {data: TData};

type __MessageTemplateSourceData<
  TMessageTemplateFunction extends MessageTemplateFunction | true
> = TMessageTemplateFunction extends MessageTemplateFunction
  ? Parameters<TMessageTemplateFunction>[0]
  : never;

type __ChannelSendParamsData<
  TMessageTemplateDefinition extends MessageTemplateDefinition | true
> = TMessageTemplateDefinition extends MessageTemplateDefinition
  ? Intersection<
      | __MessageTemplateSourceData<
          ValueWithType<TMessageTemplateDefinition, MessageTemplateFunction>
        >
      | Record<KeyOfValueWithType<TMessageTemplateDefinition, true>, string>
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

type __ChannelSendParams<
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
  constructor(definitionDict: TDefinitionDict, queue: IChannelQueue<TTarget>);
  constructor(
    private definitionDict: MessageTemplateDefinitionDict,
    private queue: IChannelQueue<TTarget>,
  ) {}

  async send(
    params: __ChannelSendParams<TTarget, TDefinitionDict>,
  ): Promise<void>;
  async send({
    type,
    targets,
    data = {},
  }: ChannelSendParams<TTarget>): Promise<void> {
    let definition = this.definitionDict[type];

    if (definition === true) {
      definition = {};
    }

    let templateData = _.mapValues(definition, (fn, key) =>
      typeof fn === 'function' ? fn(data) : (data[key] as string),
    );

    for (let target of targets) {
      await this.addMessage(target, {
        type,
        templateData,
      });
      await this.queue.queueSignal(target, undefined, 0);
    }
  }

  protected abstract addMessage(
    target: TTarget,
    data: SignalMessageData,
  ): Promise<void>;

  protected abstract resolveMessages(
    target: TTarget,
    messageIds?: SignalMessageId[],
  ): Promise<void>;
}

export const AbstractChannel = Channel;

export interface IChannel<
  TTarget,
  TDefinitionDict extends MessageTemplateDefinitionDict
> extends Channel<TTarget, TDefinitionDict> {}

// const definitionDict = {
//   foo: {
//     yoha: true,
//     hello: ({}: {foo: string}): string => '',
//     helloX: ({}: {bar: number}): string => '',
//   },
//   bar: true,
// } as const;

// let q = new Bull('');

// class XChannel extends Channel<object, typeof definitionDict> {}

// // let x = new Channel<object, typeof definitionDict>(definitionDict, []);
// let x = new XChannel(definitionDict, []);

// x.send({
//   type: 'foo',
//   targets: [],
//   data: {
//     yoha: '',
//     foo: '',
//     bar: 123,
//   },
// }).catch();

// x.send({
//   type: 'bar',
//   targets: [],
// }).catch();
