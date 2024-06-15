import Common from '../../Common'

export default class Migrate extends Common {

  public static async run() {

    let database = await this.getInput('What database should I use?')
    let seed = await this.getYesNo('Should I seed the database for you?')

    let command = `migrate ${seed ? '--seed' : ''} ${database.length > 0 ? '--database=' + database : ''}`

    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('The migration failed', info.err)
      } else {
        this.showMessage('The migration has completed')
      }
    })
  }
}