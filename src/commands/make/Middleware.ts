import Common from '../../Common';

export default class MakeMiddleware extends Common {
  public static async run() {
    // Get the name of the controller to create
    let middleName = await this.getInput('Middleware Name');
    if (middleName.length === 0) {
      this.showError('A middleware name is required');
      return;
    }

    let command = `make:middleware ${middleName}`;

    // Generate the controller
    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the middleware', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Http/Middleware/' + middleName + '.php');
      }
    });
  }
}
