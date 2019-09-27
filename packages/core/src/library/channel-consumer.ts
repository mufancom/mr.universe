import _ from 'lodash';

import {IChannelQueue} from './channel-queue';
import {ISignal, SignalMessage, SignalMessageId, SignalName} from './signal';

export interface UnacknowledgedMessageInfo {
  message: SignalMessage;
  deliveredSignals: SignalName[];
}

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
  protected abstract getUnacknowledgedMessagesNotDeliveredBySignal(
    target: TTarget,
    signalName: SignalName,
  ): Promise<UnacknowledgedMessageInfo[]>;

  protected async processSignal(
    target: TTarget,
    signalName: SignalName,
  ): Promise<void> {
    let signal = this.signalNameToSignalMap.get(signalName)!;

    let throttleReleasesAt = await signal.isThrottled(target);

    if (throttleReleasesAt) {
      let timeout = Math.max(throttleReleasesAt - Date.now(), 0);

      await this.queue.queueSignal(target, signalName, timeout);
      return;
    }

    let excludedPrecedingSignalNames = signal.getExcludedPrecedingSignalNames();

    let infos = await this.getUnacknowledgedMessagesNotDeliveredBySignal(
      target,
      signalName,
    );

    if (!infos.length) {
      return;
    }

    let nextSignalName = this.getNextSignalName(signalName);

    let messages = infos
      .filter(
        ({deliveredSignals: deliveredSignalNames}) =>
          _.intersection(deliveredSignalNames, excludedPrecedingSignalNames)
            .length === 0,
      )
      .map(info => info.message);

    if (!messages.length) {
      if (nextSignalName) {
        await this.processSignal(target, nextSignalName);
      }

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

    if (nextSignalName) {
      if (delivered) {
        let {acknowledgeTimeout} = signal.options;

        if (acknowledgeTimeout) {
          await this.queue.queueSignal(
            target,
            nextSignalName,
            acknowledgeTimeout,
          );
        }
      } else {
        await this.processSignal(target, nextSignalName);
      }
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
