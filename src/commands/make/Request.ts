import Common from '../../Common';

export default class MakeRequest extends Common {
  public static async run() {
    let requestName = await this.getInput('Request Name');
    if (requestName.length === 0) {
      this.showError('A request name is required');
      return;
    }

    let command = `make:request ${requestName}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the request', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Http/Requests/' + requestName + '.php');
      }
    });
  }
}
