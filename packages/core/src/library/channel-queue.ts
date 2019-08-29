import {SignalName} from './signal';

export type ChannelQueueSignalProcessor<TTarget> = (
  target: TTarget,
  signalName: SignalName | undefined,
) => Promise<void>;

export interface IChannelQueue<TTarget> {
  queueSignal(
    target: TTarget,
    signalName: SignalName | undefined,
    delay: number,
  ): Promise<void>;

  processSignal(processor: ChannelQueueSignalProcessor<TTarget>): void;
}
