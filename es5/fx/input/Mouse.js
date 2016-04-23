"use strict";

/* global Primrose, THREE, isChrome, pliny */

Primrose.Input.Mouse = function () {

  pliny.class({
    parent: "Primrose.Input",
    name: "Mouse",
    description: "| [under construction]"
  });
  function MouseInput(name, DOMElement, commands, socket) {
    DOMElement = DOMElement || window;
    Primrose.Input.ButtonAndAxis.call(this, name, commands, socket, MouseInput.AXES);
    this.setLocation = function (x, y) {
      this.X = x;
      this.Y = y;
    };

    this.setMovement = function (dx, dy) {
      this.X += dx;
      this.Y += dy;
    };

    DOMElement.addEventListener("mousedown", function (event) {
      this.setButton(event.button, true);
      this.BUTTONS = event.buttons << 10;
      this.update();
    }.bind(this), false);

    DOMElement.addEventListener("mouseup", function (event) {
      this.setButton(event.button, false);
      this.BUTTONS = event.buttons << 10;
      this.update();
    }.bind(this), false);

    DOMElement.addEventListener("mousemove", function (event) {
      this.BUTTONS = event.buttons << 10;
      if (MouseInput.Lock.isActive) {
        var mx = event.movementX,
            my = event.movementY;

        if (mx === undefined) {
          mx = event.webkitMovementX || event.mozMovementX || 0;
          my = event.webkitMovementY || event.mozMovementY || 0;
        }
        this.setMovement(mx, my);
      } else {
        this.setLocation(event.layerX, event.layerY);
      }
      this.update();
    }.bind(this), false);

    DOMElement.addEventListener("wheel", function (event) {
      if (isChrome) {
        this.W += event.deltaX;
        this.Z += event.deltaY;
      } else if (event.shiftKey) {
        this.W += event.deltaY;
      } else {
        this.Z += event.deltaY;
      }
      event.preventDefault();
      this.update();
    }.bind(this), false);
  }

  var elementName = findProperty(document, ["pointerLockElement", "mozPointerLockElement", "webkitPointerLockElement"]),
      changeEventName = findProperty(document, ["onpointerlockchange", "onmozpointerlockchange", "onwebkitpointerlockchange"]),
      errorEventName = findProperty(document, ["onpointerlockerror", "onmozpointerlockerror", "onwebkitpointerlockerror"]),
      requestMethodName = findProperty(document.documentElement, ["requestPointerLock", "mozRequestPointerLock", "webkitRequestPointerLock", "webkitRequestPointerLock"]),
      exitMethodName = findProperty(document, ["exitPointerLock", "mozExitPointerLock", "webkitExitPointerLock", "webkitExitPointerLock"]);

  changeEventName = changeEventName && changeEventName.substring(2);
  errorEventName = errorEventName && errorEventName.substring(2);

  MouseInput.Lock = {
    addChangeListener: function addChangeListener(thunk, bubbles) {
      return document.addEventListener(changeEventName, thunk, bubbles);
    },
    removeChangeListener: function removeChangeListener(thunk) {
      return document.removeEventListener(changeEventName, thunk);
    },
    addErrorListener: function addErrorListener(thunk, bubbles) {
      return document.addEventListener(errorEventName, thunk, bubbles);
    },
    removeErrorListener: function removeErrorListener(thunk) {
      return document.removeEventListener(errorEventName, thunk);
    },
    withChange: function withChange(act) {
      return new Promise(function (resolve, reject) {
        var onPointerLock,
            onPointerLockError,
            timeout,
            tearDown = function tearDown() {
          if (timeout) {
            clearTimeout(timeout);
          }
          MouseInput.Lock.removeChangeListener(onPointerLock);
          MouseInput.Lock.removeErrorListener(onPointerLockError);
        };

        onPointerLock = function onPointerLock() {
          setTimeout(tearDown);
          resolve(MouseInput.Lock.element);
        };

        onPointerLockError = function onPointerLockError(evt) {
          setTimeout(tearDown);
          reject(evt);
        };

        MouseInput.Lock.addChangeListener(onPointerLock, false);
        MouseInput.Lock.addErrorListener(onPointerLockError, false);

        if (act()) {
          tearDown();
          resolve();
        } else {
          // Timeout wating on the pointer lock to happen, for systems like iOS that
          // don't properly support it, even though they say they do.
          timeout = setTimeout(function () {
            tearDown();
            reject("Pointer Lock state did not change in allotted time");
          }, 1000);
        }
      });
    },
    request: function request(elem) {
      return MouseInput.Lock.withChange(function () {
        if (!requestMethodName) {
          console.error("No Pointer Lock API support.");
          throw new Error("No Pointer Lock API support.");
        } else if (MouseInput.Lock.isActive) {
          return true;
        } else {
          elem[requestMethodName]();
        }
      });
    },
    exit: function exit() {
      return MouseInput.Lock.withChange(function () {
        if (!exitMethodName) {
          console.error("No Pointer Lock API support.");
          throw new Error("No Pointer Lock API support.");
        } else if (!MouseInput.Lock.isActive) {
          return true;
        } else {
          document[exitMethodName]();
        }
      });
    }
  };

  Object.defineProperties(MouseInput.Lock, {
    element: {
      get: function get() {
        return document[elementName];
      }
    },
    isActive: {
      get: function get() {
        return !!MouseInput.Lock.element;
      }
    }
  });

  MouseInput.AXES = ["X", "Y", "Z", "W", "BUTTONS"];
  Primrose.Input.ButtonAndAxis.inherit(MouseInput);

  return MouseInput;
}();