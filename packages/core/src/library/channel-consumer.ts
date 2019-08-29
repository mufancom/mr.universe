import {IChannelQueue} from './channel-queue';
import {ISignal, SignalMessage, SignalMessageId, SignalName} from './signal';

abstract class ChannelConsumer<TTarget> {
  private signalNameToSignalMap: Map<SignalName, ISignal<TTarget>>;

  constructor(signals: ISignal<TTarget>[], queue: IChannelQueue<TTarget>);
  constructor(
    signals: ISignal<TTarget>[],
    private queue: IChannelQueue<TTarget>,
  ) {
    this.signalNameToSignalMap = new Map(
      signals.map(signal => [signal.name, signal]),
    );

    queue.processSignal((...args) => this.processSignal(...args));
  }

  private get firstSignalName(): SignalName {
    return this.signalNameToSignalMap.keys().next().value;
  }

  protected abstract markMessagesProcessedWithSignal(
    target: TTarget,
    ids: SignalMessageId[],
    signalName: SignalName,
    delivered: boolean,
  ): Promise<void>;

  /**
   * @param target The message target.
   * @param signalName The name of signal via which the message has not been successfully delivered.
   */
  protected abstract getUnresolvedMessagesNotDeliveredBySignal(
    target: TTarget,
    signalName: SignalName,
  ): Promise<SignalMessage[]>;

  protected async processSignal(
    target: TTarget,
    signalName = this.firstSignalName,
  ): Promise<void> {
    let signal = this.signalNameToSignalMap.get(signalName)!;

    let throttleReleaseTimeout = await signal.isThrottled(target);

    if (throttleReleaseTimeout) {
      await this.queue.queueSignal(target, signalName, throttleReleaseTimeout);
      return;
    }

    let messages = await this.getUnresolvedMessagesNotDeliveredBySignal(
      target,
      signalName,
    );

    if (!messages.length) {
      return;
    }

    let messageIds = messages.map(message => message.id);

    let delivered = await signal.send(target, messages);

    await this.markMessagesProcessedWithSignal(
      target,
      messageIds,
      signalName,
      delivered,
    );

    if (delivered) {
      return;
    }

    let nextSignalName = this.getNextSignalName(signalName);

    if (nextSignalName) {
      await this.processSignal(target, nextSignalName);
    }
  }

  private getNextSignalName(signalName: SignalName): SignalName | undefined {
    let signalNames = Array.from(this.signalNameToSignalMap.keys());

    let index = signalNames.indexOf(signalName);

    return index >= 0 && index < signalNames.length - 1
      ? signalNames[index + 1]
      : undefined;
  }
}

export const AbstractChannelConsumer = ChannelConsumer;

export interface IChannelConsumer<TTarget> extends ChannelConsumer<TTarget> {}
