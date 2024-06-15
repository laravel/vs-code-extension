import Common from '../../Common'

export default class RouteCacheClear extends Common {

  public static async run() {
    let command = `route:clear`
    this.execCmd(command, async (info) => {
      if (info.err) {
        return this.showError('The route cache could not be cleared', info.err)
      } else {
        return this.showMessage('The route cache was cleared')
      }
    })
  }
}