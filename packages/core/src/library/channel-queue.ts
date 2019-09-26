import {SignalName} from './signal';

export type ChannelQueueSignalProcessor<TTarget> = (
  target: TTarget,
  signalName: SignalName,
) => Promise<void>;

export interface IChannelQueue<TTarget> {
  queueSignal(
    target: TTarget,
    signalName: SignalName,
    delay: number,
  ): Promise<void>;

  processSignal(processor: ChannelQueueSignalProcessor<TTarget>): void;
}
