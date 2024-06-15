import Common from '../../Common'

export default class MigrateInstall extends Common {

  public static async run() {

    let database = await this.getInput('What database should I use?')
    let command = `migrate:install ${database.length > 0 ? '--database=' + database : ''}`

    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('The migration repository was not installed', info.err)
      } else {
        this.showMessage('The migration repository was installed')
      }
    })
  }
}