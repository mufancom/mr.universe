# Mr. Universe

## Usage

```ts
let mu = new MrUniverse();

let appWebSocketSignal = new WebSocketSignal();
let appWebPushSignal = new WebPushSignal();
let appEmailSignal = new EmailSignal();

let appChannel = new Channel(messageDict, [
  appWebSocketSignal,
  appWebPushSignal,
  appEmailSignal,
]);

let announcementChannel = new Channel([new EmailSignal()]);

appChannel.send({
  type: 'started-node',
  targets: [
    // Single target, single user.
    {
      type: 'user',
      id: 'xxx',
    },
    // Single target, multiple users.
    {
      type: 'users',
      ids: ['xxx', 'yyy'],
    },
  ],
});

announcementChannel.send({
  type: 'scheduled-system-maintenance',
});
```

## Concepts

### `signal`

A signal is a method to deliver messages, e.g.: push notifications, emails etc.

### `channel`

A channel is a identifier to bundle and deduplicate messages.

### `target`

A target is a specific one user or a set of users. There are usually multiple delivery `signal` for a single target.

E.g.: A user can be reached via app built-in notifications, push notifications, emails etc; while a group of user can usually be reached by a shared mailbox.

### `message`

## Goals

- Ability to deliver notifications with multiple levels of fallbacks.
- Ability to control notification frequency and merge notifications.
- Provide asynchronous notification feedback interface for fallbacks.

- Cooling

## Typical signals

### App WebSocket

- Usually controlled by app itself, so always broadcast if the client is online.

### DingTalk

Apps like DingTalk sets frequency limits for the push notifications.

### Email

### Push

- Several immediate push notifications.
  - E.g.: "{nickname}: {message}"
- Followed by delayed, grouped push notifications.
  - E.g.: "You have received {count} messages during the passed {duration} minutes."
  - There could be incremental time spans.
- But after clicking one of the push notification, it could restore the "immediate" frequency.
- Push notification may not be necessary if the user is active.

```ts
channel.send(
  type: 'foo',
  targets: ['xxx'],
  data: {}
);
```

```ts
let message = {
  type: 'foo',
  templateData: {},
};
```

场景

1. 成功发送消息推送后 30 分钟无响应，发送邮件。
2. 连续成功发送 3 条消息推送后无响应，逐步降低频率合并消息。
   1. 如果存在下一级消息送达方式，如邮件，
   2. 如果

signals：

1. app
2. push
3. email

如果已经有消息在等待 email 合并发送 (email signal throttled), 此时有新消息, 如何处理?

> 新消息应该从头进入原有管道, 但同时应该被邮件合并.

如果已经有消息在等待 push 合并发送 (push signal throttled), 此时有新消息, 加入 push 合并的同时是否通过 email 发送?

> 暂定否.

如果连续的消息中, 位于前面的消息 push 失败, 准备邮件 (email signal throttled), 接下来的消息 push 成功...

> 不存在这种情况, 如果前面的消息 push 失败, 接下来的 push 需要合并前面失败且 unresolved 的消息.

如果先后 push 了若干消息, 前面的消息已经 resolve timed out...

> 只触发最早的一个 timed out?

... 但会不会出现 race condition 导致漏掉消息?

> 所以还是每一个组 messages 有单独的 timeout schedule, 确保同一 target 且同一 signal 的 schedule 不会同时执行.

只确保同一 target 的 timeout schedule 不会同时执行有什么问题吗?

> 可能更稳当一点? 所以暂定全局都确保 schedule 的任务相同的 target 只有一个在执行.

---

# Message

- processed signals
- succeeded signals
- resolved

# Signal

- target
- throttled

# When to wake up

- signal throttle released
  - queue key `throttle-release:${signalName}:${uniqueTargetId}`
- message resolve timed out
  - queue key `resolve-timeout:${signalName}:${uniqueTargetIdj}`

# When wake up (target, signal)

- is this signal throttled with the target?
  - setup wake up with this signal, end.
- retrieve unresolved messages that haven't been successfully delivered by this signal.
  - no message?
    - end.
  - send messages with this signal.
    - succeeded?
      - setup wake up with next signal.
    - failed?
      - begin this process with the next signal.

# Throttling strategies

1.
