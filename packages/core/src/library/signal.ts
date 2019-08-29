import {Dict, Nominal} from 'tslang';

export type SignalName = Nominal<string, 'mu:signal-name'>;

export type SignalMessageId = Nominal<string, 'mu:signal-message-id'>;

export interface SignalMessageData {
  type: string;
  templateData: Dict<string>;
}

export interface SignalMessage extends SignalMessageData {
  id: SignalMessageId;
}

abstract class Signal<TTarget> {
  constructor(name: string);
  constructor(readonly name: SignalName) {}

  abstract async send(
    target: TTarget,
    messages: SignalMessageData[],
  ): Promise<boolean>;

  abstract isThrottled(target: TTarget): Promise<number>;
}

export const AbstractSignal = Signal;

export interface ISignal<TTarget> extends Signal<TTarget> {}
