import * as fs from 'fs';
import Common from '../../Common';

export default class MakeSeeder extends Common {
  public static async run() {
    let seedName = await this.getInput('Seeder Name');
    if (seedName.length === 0) {
      this.showError('A seeder name is required');
      return;
    }

    let command = `make:seeder ${seedName}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the seeder', info.err);
      } else {
        if (fs.existsSync(info.artisan.dir + '/database/seeders/' + seedName + '.php')) {
          await this.openFile(info.artisan.dir, '/database/seeders/' + seedName + '.php');
        } else {
          await this.openFile(info.artisan.dir, '/database/seeds/' + seedName + '.php');
        }
      }
    });
  }
}
