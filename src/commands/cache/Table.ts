import Common from '../../Common'

export default class CacheTable extends Common {

  public static async run() {
    let command = `cache:table`
    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('A migration table could not be created for the cache database table', info.err)
      } else {
        this.showMessage('A migration table was created for the cache database table')
      }
    })
  }
}