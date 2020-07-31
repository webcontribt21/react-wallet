import { all, fork } from 'redux-saga/effects'
import watchAuth from 'redux/sagas/auth'

export default function * rootSaga () {
  yield all([
    fork(watchAuth)
  ])
}
