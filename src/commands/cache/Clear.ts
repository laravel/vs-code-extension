import Common from '../../Common'

export default class CacheClear extends Common {

  public static async run() {

    let store = await this.getInput('Store name (Leave blank to clear everything)')
    let tags = await this.getInput('Should I clear specific tags?')
    let command = `cache:clear ${store} ${tags.length > 0 ? '--tags=' + tags : ''}`

    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('The cache could not be cleared', info.err)
      } else {
        this.showMessage('The cache was cleared')
      }
    })
  }
}