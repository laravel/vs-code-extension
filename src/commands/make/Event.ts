import Common from '../../Common';

export default class MakeEvent extends Common {
  public static async run() {
    let evtName = await this.getInput('Event Name');
    if (evtName.length === 0) {
      this.showError('An event name is required');
      return;
    }
    let command = `make:event ${evtName}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the event', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Events/' + evtName + '.php');
      }
    });
  }
}
