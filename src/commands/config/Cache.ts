import Common from '../../Common'

export default class ConfigCache extends Common {

  public static async run() {
    let command = `config:cache`
    this.execCmd(command, async (info) => {
      if (info.err) {
        return this.showError('The config cache could not be created', info.err)
      } else {
        return this.showMessage('The config was cached')
      }
    })
  }
}