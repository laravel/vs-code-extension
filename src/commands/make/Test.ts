import Common from '../../Common';

export default class MakeTest extends Common {
  public static async run() {
    // Get the name of the controller to create
    let testName = await this.getInput('Test Name');
    if (testName.length === 0) {
      this.showError('A test name is required');
      return;
    }

    // Determine if this is a resource controller or not
    let isUnitTest = await this.getYesNo('Should I make this a unit test?');
    let command = `make:test ${testName} ${isUnitTest ? '--unit' : ''}`;

    // Generate the controller
    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the test', info.err);
      } else {
        await this.openFile(info.artisan.dir, `/tests/${isUnitTest ? 'Unit' : 'Feature'}/${testName}.php`);
      }
    });
  }
}
