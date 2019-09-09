import {Dict, Nominal} from 'tslang';

export type SignalName = Nominal<string, 'mu:signal-name'>;

export type SignalMessageId = Nominal<string, 'mu:signal-message-id'>;

export interface SignalMessageData {
  type: string;
  data: Dict<unknown>;
}

export interface SignalMessage extends SignalMessageData {
  id: SignalMessageId;
}

export interface SignalOptions {
  readonly acknowledgeTimeout?: number;
}

abstract class Signal<TTarget> {
  constructor(name: string, options: SignalOptions);
  constructor(readonly name: SignalName, readonly options: SignalOptions) {}

  abstract async send(
    target: TTarget,
    messages: SignalMessageData[],
  ): Promise<boolean>;

  abstract isThrottled(target: TTarget): Promise<number | undefined>;

  getExcludedPrecedingSignalNames(): SignalName[] {
    return [];
  }
}

export const AbstractSignal = Signal;

export interface ISignal<TTarget> extends Signal<TTarget> {}
