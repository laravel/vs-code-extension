import Common from '../../Common'

export default class EventGenerate extends Common {

  public static async run() {

    let command = `event:generate`

    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('Events could not be generated', info.err)
      } else {
        this.showMessage('Events generated')
      }
    })
  }
}