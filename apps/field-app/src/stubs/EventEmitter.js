// Stub for react-native/Libraries/vendor/emitter/EventEmitter (web build)
export default class EventEmitter {
  _listeners = {};
  addListener(event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return { remove: () => this.removeListener(event, fn) };
  }
  removeListener(event, fn) {
    const list = this._listeners[event];
    if (list) this._listeners[event] = list.filter((f) => f !== fn);
  }
  emit(event, ...args) {
    (this._listeners[event] || []).forEach((fn) => fn(...args));
  }
  removeAllListeners(event) {
    if (event) delete this._listeners[event];
    else this._listeners = {};
  }
}
