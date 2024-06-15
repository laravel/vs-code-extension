import Common from '../../Common'

export default class Optimize extends Common {

  public static async run() {

    let optComposer = await this.getYesNo('Should I optimize Composer\'s dump-autoload?')

    let command = `optimize ${!optComposer ? '--psr' : ''}`

    this.execCmd(command, async (info) => {
      if (info.err) {
        this.showError('Optimization failed', info.err)
      } else {
        this.showMessage('The framework was optimized')
      }
    })
  }
}