import Common from '../../Common'

export default class ViewClear extends Common {

  public static async run() {
    let command = `view:clear`
    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('The views could not be cleared', info.err)
      } else {
        this.showMessage('The views were cleared')
      }
    })
  }
}