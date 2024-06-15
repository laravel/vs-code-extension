import Common from '../../Common';

export default class MakeCast extends Common {
  public static async run() {
    let cmdName = await this.getInput('Cast Name');
    if (cmdName.length === 0) {
      this.showError('A cast name is required');
      return;
    }

    const isInbound = await this.getNoYes('Should I create an inbound cast?');
    const cmd = `make:cast ${cmdName} ${isInbound ? '--inbound' : ''}`;

    this.execCmd(cmd, async info => {
      if (info.err) {
        this.showError('Could not create the cast', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Casts/' + cmdName + '.php');
      }
    });
  }
}
