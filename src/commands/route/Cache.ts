import Common from '../../Common'

export default class RouteCache extends Common {

  public static async run() {
    let command = `route:cache`
    this.execCmd(command, async (info) => {
      if (info.err) {
        return this.showError('The route cache could not be created', info.err)
      } else {
        return this.showMessage('The route was cached')
      }
    })
  }
}