import Common from '../../Common';

export default class MakeChannel extends Common {
  public static async run() {
    let cmdName = await this.getInput('Channel Name');
    if (cmdName.length === 0) {
      this.showError('A channel name is required');
      return;
    }

    this.execCmd('make:channel', async info => {
      if (info.err) {
        this.showError('Could not create the channel', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Broadcasting/' + cmdName + '.php');
      }
    });
  }
}
