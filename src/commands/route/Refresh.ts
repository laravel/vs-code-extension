import { window, workspace } from 'vscode'
import cp = require('child_process')
import Common from '../../Common'

import RouteCache from './Cache'
import RouteClear from './Clear'

export default class RouteCacheRefresh extends Common {

  public static async run() {
    await RouteClear.run()
    await RouteCache.run()
  }
}