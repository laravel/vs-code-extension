import Common from '../../Common'

export default class MigrateRollback extends Common {

  public static async run() {

    let database = await this.getInput('What database should I use?')
    let command = `migrate:rollback ${database.length > 0 ? '--database=' + database : ''}`

    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('The database could not be rolled back', info.err)
      } else {
        this.showMessage('The database has been rolled back')
      }
    })
  }
}