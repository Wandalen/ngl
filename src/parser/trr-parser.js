/**
 * @file Trr Parser
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Debug, Log, ParserRegistry } from '../globals.js'
import TrajectoryParser from './trajectory-parser.js'

class TrrParser extends TrajectoryParser {
  get type () { return 'trr' }

  _parse () {
    // https://github.com/gromacs/gromacs/blob/master/src/gromacs/fileio/trrio.cpp

    if (Debug) Log.time('TrrParser._parse ' + this.name)

    var bin = this.streamer.data
    if (bin instanceof Uint8Array) {
      bin = bin.buffer
    }
    var dv = new DataView(bin)

    var f = this.frames
    var coordinates = f.coordinates
    var boxes = f.boxes
    // var header = {}

    let offset = 0
    // const frameInfo = []

    while (true) {
      // const frame = {}

      // const magicnum = dv.getInt32(offset)
      // const i1 = dv.getFloat32(offset + 4)
      offset += 8

      const versionSize = dv.getInt32(offset)
      offset += 4
      offset += versionSize

      // const irSize = dv.getInt32(offset)
      // const eSize = dv.getInt32(offset + 4)
      const boxSize = dv.getInt32(offset + 8)
      const virSize = dv.getInt32(offset + 12)
      const presSize = dv.getInt32(offset + 16)
      // const topSize = dv.getInt32(offset + 20)
      // const symSize = dv.getInt32(offset + 24)
      const coordSize = dv.getInt32(offset + 28)
      const velocitySize = dv.getInt32(offset + 32)
      const forceSize = dv.getInt32(offset + 36)
      const natoms = dv.getInt32(offset + 40)
      // frame.natoms = natoms
      // frame.step = dv.getInt32(offset + 44)
      // const nre = dv.getInt32(offset + 48)
      offset += 52

      const floatSize = boxSize / 9
      const natoms3 = natoms * 3

      // if (floatSize === 8) {
      //   frame.time = dv.getFloat64(offset)
      //   frame.lambda = dv.getFloat64(offset + 8)
      // } else {
      //   frame.time = dv.getFloat32(offset)
      //   frame.lambda = dv.getFloat32(offset + 4)
      // }
      offset += 2 * floatSize

      if (boxSize) {
        const box = new Float32Array(9)
        if (floatSize === 8) {
          for (let i = 0; i < 9; ++i) {
            box[i] = dv.getFloat64(offset) * 10
            offset += 8
          }
        } else {
          for (let i = 0; i < 9; ++i) {
            box[i] = dv.getFloat32(offset) * 10
            offset += 4
          }
        }
        boxes.push(box)
      }

      // ignore, unused
      offset += virSize

      // ignore, unused
      offset += presSize

      if (coordSize) {
        let frameCoords
        if (floatSize === 8) {
          frameCoords = new Float32Array(natoms3)
          for (let i = 0; i < natoms3; ++i) {
            frameCoords[i] = dv.getFloat64(offset) * 10
            offset += 8
          }
        } else {
          const tmp = new Uint32Array(bin, offset, natoms3)
          for (let i = 0; i < natoms3; ++i) {
            const value = tmp[i]
            tmp[i] = (
              ((value & 0xFF) << 24) | ((value & 0xFF00) << 8) |
              ((value >> 8) & 0xFF00) | ((value >> 24) & 0xFF)
            )
          }
          frameCoords = new Float32Array(bin, offset, natoms3)
          for (let i = 0; i < natoms3; ++i) {
            frameCoords[i] *= 10
            offset += 4
          }
        }
        coordinates.push(frameCoords)
      }

      // ignore, unused
      offset += velocitySize

      // ignore, unused
      offset += forceSize

      // frameInfo.push(frame)

      if (offset >= bin.byteLength) break
    }

    if (Debug) Log.timeEnd('TrrParser._parse ' + this.name)
  }
}

ParserRegistry.add('trr', TrrParser)

export default TrrParser