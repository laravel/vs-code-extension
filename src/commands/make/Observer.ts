import Common from '../../Common';

export default class MakeObserver extends Common {
  public static async run() {
    // Get the name of the observer to create
    let observerName = await this.getInput('Observer Name');
    if (observerName.length === 0) {
      this.showError('An observer name is required');
      return;
    }

    let modelName = '';
    // Get the name of the model for observer
    modelName = await this.getInput('Model Name');

    let command = `make:observer ${observerName} --model=${modelName}`;

    // Generate the observer
    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the observer', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Observers/' + observerName + '.php');
      }
    });
  }
}
