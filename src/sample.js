try {
  let hubot = require("hubot/es2015")
} catch(error) {
  const prequire = require('parent-require')
  hubot = prequire("hubot/es2015")
}

const { Adapter, User, TextMessage, Robot } = hubot

class Sample extends Adapter {
  constructor(props) {
    super(props)
    this.robot.logger.info("Constructor")
  }

  send(envelope, ...strings) {
    this.robot.logger.info("Send")
  }

  reply(envelope, ...strings) {
    this.robot.logger.info("Reply")
  }

  run() {
    this.robot.logger.info("Run")
    this.emit("connected")
    const user = new User(1001, { name: 'Sample User' })
    const message = new TextMessage(user, 'Some Sample Message', 'MSG-001')
    this.robot.receive(message)
  }
}

exports.use = (robot) => {
  return new Sample(robot)
}
