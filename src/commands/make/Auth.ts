import Common from '../../Common'

export default class MakeAuth extends Common {

  public static async run() {

    let onlyViews = await this.getYesNo('Should only the views be created?')
    let overWrite = await this.getYesNo('Should the views be overwritten?')

    let command = `make:auth ${onlyViews ? '--views' : ''} ${overWrite ? '--force' : ''}`

    // Generate the controller
    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('Could not create the auth', info.err)
      } else {
        this.showMessage('Auth has successfully be created.')
      }
    })
  }
}