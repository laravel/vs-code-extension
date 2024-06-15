import Common from '../../Common';

export default class MakeRule extends Common {
  public static async run() {
    let cmdName = await this.getInput('Rule Name');
    if (cmdName.length === 0) {
      this.showError('A rule name is required');
      return;
    }

    const isImplicit = await this.getNoYes('Should this rule be implicit?');
    const cmd = `make:rule ${cmdName} ${isImplicit ? '--implicit' : ''}`;

    this.execCmd(cmd, async info => {
      if (info.err) {
        this.showError('Could not create the rule', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Rules/' + cmdName + '.php');
      }
    });
  }
}
