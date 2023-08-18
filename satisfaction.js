/*
    * Satisfaction - Simple MVVM Javascript Framework for different web apps.
    * Repository: https://github.com/ProCompTEAM/satisfaction
    * Copyright © 2023 Kirill Poroh & Co. Public version. MIT License.
*/

/*
    DEPARTMENT -> GENERAL CONSTANTS
*/

const SF_PUBLIC_VERSION = "1.1.2";

/*
    DEPARTMENT -> COMMON VARIABLES
*/

var sf_component_javascript_allowed = true;
var sf_component_style_add_new_class = true;
var sf_component_loading_indicator = null;
var sf_component_templates = new Object();
var sf_component_last_set = null;
var sf_component_navigation_name_set = null;

var sf_routing_allowed = false;
var sf_routing_path_template = null;

var sf_model_multiplier_default_functions_allowed = true;

var sf_point_shared_objects = new Object();

var sf_state_ls_prefix = 'sf_';
var sf_states = new Object();

/*
    DEPARTMENT -> FRAMEWORK DEFAULTS
*/

/**
 * Initialize and prepare to use framework dependencies
 * @return {void}
 */
function sf_initialize(callbackSetup = null) {
    sf_routing_allowed = document.body.hasAttribute("allow-routing");

    if(callbackSetup) {
        callbackSetup();
    }

    sf_component_setup();
    
    console.log("Satisfaction initialized, v." + SF_PUBLIC_VERSION);
}


/*
    DEPARTMENT -> COMPONENT MECHANICS
*/

/**
 * Initialize and prepare to use components in document
 * @return {void}
 */
function sf_component_setup() {
    sf_component_load_default(document.body);

    if(sf_routing_allowed) {
        sf_routing_find_navigation_route();
    }
}

/**
 * Loads the default components specified in the target element (with 'default' attribute).
 * @param {HTMLElement} targetElement - The target element to search for default components.
 * @return {void}
 */
function sf_component_load_default(targetElement) {
    const components = targetElement.querySelectorAll("component[default]");

    sf_component_claim_anonymous(components);
    
    if(components && components.length > 0) {
        const componentNames = Array.from(components).map(component => component.getAttribute("name"));
        sf_component_load(componentNames);
    }
}

/**
 * Claims anonymous components by assigning them a unique name based on their source path and static key.
 * @param {NodeList} componentElements - A NodeList of component elements to claim as anonymous.
 * @return {void}
 */
function sf_component_claim_anonymous(componentElements) {
    componentElements.forEach(componentElement => {
        if(!componentElement.hasAttribute('name')) {
            const sourcePath = componentElement.getAttribute('src');
            const fileName = sourcePath.match(/[^\/]+(?=\.)/)[0];
            const staticKey = sf_hash(sf_xpath_element(componentElement));
            const newName = `${fileName}-${staticKey}`;
            componentElement.setAttribute('name', newName);
            componentElement.setAttribute('anonymous', '');
        }
    });
}

/**
 * Load/Reload component and prepare it for use
 * @param {string[]} componentNames - An array of component names to load.
 * @param {boolean} [preloadSubcomponents=true] - Whether to preload subcomponents.
 * @param {*} [sharedInputData=null] - Shared object from another place.
 * @return {void}
 */
function sf_component_load(componentNames, preloadSubcomponents = true, sharedInputData = null) {
    document.body.querySelectorAll('component[name="' + componentNames[0] + '"]').forEach(
        function(componentElement, index, array) {
            if(!componentElement.hasAttribute("loaded")) {
                if(sf_component_loading_indicator) {
                    componentElement.innerHTML = sf_component_loading_indicator;
                }

                const source = componentElement.getAttribute("src");

                if(sf_component_templates[source]) {
                    sf_component_set(componentElement, sf_component_templates[source], sharedInputData)
                        .then(() => { sf_component_load_more(componentElement); });
                } else {
                    const xmlHttpRequest = new XMLHttpRequest();
                    xmlHttpRequest.open('GET', source, true);
                    xmlHttpRequest.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
                    xmlHttpRequest.onload = function() {
                        sf_component_templates[source] = this.responseText;
                        sf_component_set(componentElement, this.responseText, sharedInputData)
                            .then(() => { sf_component_load_more(componentElement); });
                    };
                    xmlHttpRequest.send();
                }
            }
        }
    );

    function sf_component_load_more(componentElement) {
        componentNames.shift();
        
        if(componentNames.length > 0) {
            sf_component_load(componentNames, preloadSubcomponents);
        }

        if(preloadSubcomponents) {
            sf_component_load_default(componentElement);
        }
    }
}

/**
 * Set the content of a component element and apply default settings, styles, and navigation tracking.
 * @param {HTMLElement} componentElement - The component element to set.
 * @param {string} content - The content to set for the component element.
 * @param {*} [sharedInputData=null] - Shared input data for the component.
 * @return {Promise} A promise that resolves when the component is set.
 */
function sf_component_set(componentElement, content, sharedInputData = null) {
    return new Promise((sf_resolve) => {
        componentElement.innerHTML = content;

        sf_component_last_set = componentElement;

        sf_component_set_defaults(componentElement);

        sf_component_apply_styles(componentElement);

        sf_component_track_navigation(componentElement);

        componentElement.inputData = sharedInputData;

        componentElement.setAttribute("loaded", "");

        if (sf_component_javascript_allowed) {
            sf_component_execute_js(componentElement);
        }

        sf_resolve();
    });
}

/**
 * Set default properties and methods for a component element.
 * @param {HTMLElement} componentElement - The component element to set defaults for.
 * @return {void}
 */
function sf_component_set_defaults(componentElement) {
    componentElement.name = componentElement.getAttribute("name");

    componentElement.find = function(name) {
        const result = componentElement.querySelectorAll(`*[name="${name}"]`)[0];

        if(result?.tagName.toLowerCase() === 'component') {
            sf_component_set_defaults(result);
        }

        return result;
    }

    componentElement.findClasses = function(className) {
        return componentElement.querySelectorAll(`.${className}`);
    }

    componentElement.load = function(preloadSubcomponents = true, inputData = null) {
        sf_component_load([componentElement.name], preloadSubcomponents, inputData);
    }

    componentElement.unload = function() {
        sf_component_unload(componentElement.name);
    }

    componentElement.hasLoaded = function() {
        return componentElement.hasAttribute("loaded");
    }

    componentElement.navigate = function() {
        sf_component_navigate(componentElement.name);
    }

    componentElement.state = function(name) {
        const componentNameKey = `component.${componentElement.name}.${name}`;
        return sf_state_get(componentNameKey);
    }

    componentElement.setState = function(name, value = null, setLocalStorage = false) {
        const componentNameKey = `component.${componentElement.name}.${name}`;
        sf_state_set(componentNameKey, value, setLocalStorage);
    }

    componentElement.setModel = function(model, templateName) {
        componentElement.querySelectorAll(`[template="${templateName}"]`).forEach(
            function(element) {
                sf_model_set(element, model);
            }
        );
    }

    componentElement.setMultiplier = function(targetArray, templateName, display = 'block') {
        componentElement.querySelectorAll(`[template="${templateName}"]`).forEach(
            function(element) {
                sf_model_set_multiplier(element, targetArray, display)
            }
        );
    }
}

/**
 * Unload a component and remove it from tracking.
 * @param {string} componentName - The name of the component to unload.
 * @return {void}
 */
function sf_component_unload(componentName) {
    document.body.querySelectorAll('component[name="' + componentName + '"]').forEach(
        function(componentElement) {
            componentElement.removeAttribute("loaded", "");
            componentElement.replaceChildren();
        }
    );
}

/**
 * Track navigation for elements with the 'navigation-component-name' attribute within the target element.
 * @param {HTMLElement} [targetElement=null] - The target element to track navigation for. Defaults to the document body.
 * @return {void}
 */
function sf_component_track_navigation(targetElement = null) {
    targetElement ?? document.body;
    targetElement.querySelectorAll('*[navigation-component-name]').forEach(
        function(element, index, array) {
            let componentName = element.getAttribute("navigation-component-name");
            element.addEventListener("click", function () {
                sf_component_navigate(componentName);
            }, false);
        }
    );
}

/**
 * Navigate to a component by name.
 * @param {string} componentName - The name of the component for navigate.
 * @return {void}
 */
function sf_component_navigate(componentName) {
    if(componentName === sf_component_navigation_name_set) {
        return;
    }

    sf_component_navigation_name_set = componentName;

    sf_component_load([componentName]);
    
    document.body.querySelectorAll('component[name="' + componentName + '"]').forEach(
        function(element, index, array) {
            if(element.parentElement.hasAttribute("navigation-switch")) {
                element.parentElement.querySelectorAll('component:not([name="' + componentName + '"]').forEach(
                    function(parentComponentElement, index, array) {
                        let parentComponentName = parentComponentElement.getAttribute("name");
                        sf_component_unload(parentComponentName);
                    }
                );
            }
        }
    );

    if(sf_routing_allowed) {
        sf_routing_set_route_path(componentName);
    }
}

/**
 * Execute JavaScript in <script> tag within the target element.
 * @param {HTMLElement} targetElement - The target element to execute JavaScript within.
 * @return {void}
 */
function sf_component_execute_js(targetElement) {
    targetElement.querySelectorAll('script').forEach(
        function(scriptElement) {
            eval(sf_component_get_js_reservation() + scriptElement.innerHTML);
        }
    );

    function sf_component_get_js_reservation() {
        const component_reserved_const_name = "component";
        return `const ${component_reserved_const_name} = ${sf_component_current.name}();\n\r`;
    }
}

/**
 * Apply styles to the target element by adding a unique postfix to class names (component only).
 * @param {HTMLElement} targetElement - the target element to which the styles are applied.
 * @return {void}
 */
function sf_component_apply_styles(targetElement) {
    const postfix = sf_random_string();
    const classRegex = /(?<=\.)[\w-]+(?=[^{}]*\{)/g;
    
    targetElement.querySelectorAll('style:not([global])').forEach(
        function(style) {
            const classMatches = style.innerHTML.match(classRegex);
            style.innerHTML = style.innerHTML.replace(classRegex, `$&-${postfix}`);

            if (classMatches) {
                targetElement.querySelectorAll('[class]').forEach(element => {
                    if(sf_component_style_add_new_class) {
                        element.className = element.className.split(' ').map(name => classMatches.includes(name) ? `${name} ${name}-${postfix}` : name).join(' ');
                    } else {
                        element.className = element.className.split(' ').map(name => classMatches.includes(name) ? `${name}-${postfix}` : name).join(' ');
                    }
                });
            }
        }
    );
}

/**
 * Get the current component element.
 * @return {HTMLElement} The current component element.
 */
function sf_component_current() {
    return sf_component_last_set;
}

/*
    DEPARTMENT -> ROUTING MECHANICS
*/

/**
 * Find and navigate to a component that route based on the current path or a specified path template.
 * @return {void}
 */
function sf_routing_find_navigation_route() {
    const pathStringTemplate = sf_routing_path_template ?? window.location.pathname;
    const routeElement = document.querySelector('route[path="' + pathStringTemplate + '"]');
    if (routeElement) {
        const componentName = routeElement.getAttribute("navigation-component-name");
        sf_component_navigate(componentName);
    } else {
        sf_routing_find_default_navigation_route();
    }
}

/**
 * Find and navigate to the component with default route (with 'default' attribute).
 * @return {void}
 */
function sf_routing_find_default_navigation_route() {
    const routeElement = document.querySelector('route[default]');
    if (routeElement) {
        const componentName = routeElement.getAttribute("navigation-component-name");
        sf_component_navigate(componentName);
    }
}

/**
 * Set the current route path based on the specified component name.
 * @param {string} componentName - The name of the component to set the route path for.
 * @return {void}
 */
function sf_routing_set_route_path(componentName) {
    document.querySelectorAll('route[navigation-component-name="' + componentName + '"]').forEach(
        function(routeElement) {
            const currentURL = new URL(window.location.href);
            currentURL.pathname = routeElement.getAttribute("path");
            window.history.pushState({}, '', currentURL.href);
        }
    );
}


/*
    DEPARTMENT -> PROPERTY MANAGEMENT
*/

/**
 * Create a property object with a default value and an optional callback function to be called when the value is changed.
 * @param {*} defaultPropertyValue - The default value of the property.
 * @param {function} [raiseCallback=null] - An optional callback function to be called when the value is changed.
 * @return {object} - A property object with getter and setter methods for the value (get(), set(value), raise()).
 */
function sf_property_set(defaultPropertyValue, raiseCallback = null) {
    return {
        _value: defaultPropertyValue,
        _raiseCallback: raiseCallback,

        get value() {
            return this.get();
        },
        set value(newValue) {
            this.set(newValue);
        },

        get: function() {
            return this._value;
        },
        set: function(newValue) {
            this._value = newValue;
            this.raise();
        },
        raise: function() {
            if(this._raiseCallback) {
                this._raiseCallback(this._value);
            }
        }
      };
}


/*
    DEPARTMENT -> MODEL MECHANICS
*/

/**
 * Set a model-object for the target element and track its properties, commands, bindings.
 * @param {HTMLElement} targetElement - The target element to set the model for.
 * @param {*} model - The model to set for the target element.
 * @return {void}
 */
function sf_model_set(targetElement, model) { //add onModelUnset?
    sf_model_find_properties(targetElement);
    sf_model_track_properties(targetElement, model);
    sf_model_track_commands(targetElement, model);
    sf_model_track_bindings(targetElement, model);

    if(model.construct) {
        model.construct.bind(model)
        model.construct(targetElement);
    }
}

/**
 * Track properties of a model and update them when changed.
 * @param {HTMLElement} targetElement - The target element to track properties for.
 * @param {*} model - The model to track properties for.
 * @return {void}
 */
function sf_model_track_properties(targetElement, model) {
    Object.keys(model).forEach(
        function(key) {
            const value = model[key];
            if(!(value instanceof Function)) {
                model[key] = sf_property_set(value, function(value) {
                    sf_model_update_property(targetElement, key, value);
                });
                model[key].raise();
            }
        }
    );
}

/**
 * Find and mark properties within the target element and its child nodes.
 * @param {Node} targetElement - The target element to find properties within.
 * @return {void}
 */
function sf_model_find_properties(targetElement) {
    if(targetElement.nodeType === Node.TEXT_NODE && targetElement.nodeValue.includes('{{') && targetElement.nodeValue.includes('}}')) {
        targetElement.parentElement.setAttribute('sf-model-content-template', targetElement.nodeValue);
    }
    
    if(targetElement.attributes) {
        Array.from(targetElement.attributes)
            .filter(attribute => attribute.name !== 'bind' && attribute.name !== 'command'
                && attribute.value.includes('{{') && attribute.value.includes('}}'))
            .forEach(attribute => targetElement.setAttribute(`sf-model-template:${attribute.name}`, attribute.value));

            if((targetElement.hasAttribute('visible') || targetElement.hasAttribute('invisible'))
                && window.getComputedStyle(targetElement).getPropertyValue('display')) {
                const displayValue = window.getComputedStyle(targetElement).getPropertyValue('display');
                targetElement.setAttribute('sf-visibility-display', displayValue);
            }
    }

    Array.from(targetElement.childNodes)
        .filter(node => node.nodeName !== 'COMPONENT' && !(node instanceof Element && node.hasAttribute('template')))
        .forEach(sf_model_find_properties);
}

/**
 * Update a property within the target element and its child nodes.
 * @param {HTMLElement} targetElement - The target element to update the property within.
 * @param {string} bindableKey - The key of the property to update.
 * @param {*} value - The new value of the property.
 * @return {void}
 */
function sf_model_update_property(targetElement, bindableKey, value) {
    targetElement.querySelectorAll(':not(component)').forEach(element => {
        Array.from(element.attributes)
            .filter(attribute => attribute.name.startsWith('sf-model-template:') && attribute.value.includes(`{{${bindableKey}}}`))
            .forEach(attribute => {
                const targetAttribute = attribute.name.replace('sf-model-template:', '');
                const newValue = attribute.value.replaceAll(new RegExp(`{{${bindableKey}}}`, 'g'), value);
                element.setAttribute(targetAttribute, newValue);
                
                if(targetAttribute === 'value') {
                    element.value = newValue;
                }

                if(targetAttribute === 'visible') {
                    sf_model_update_visibility(element, newValue);
                }

                if(targetAttribute === 'invisible') {
                    const inversion = newValue === 'true' ? 'false' : 'true';
                    sf_model_update_visibility(element, inversion);
                }
            });
    });

    targetElement.querySelectorAll(`:not(component)[sf-model-content-template*="{{${bindableKey}}}"]`).forEach(element => {
        const contentTemplate = element.getAttribute('sf-model-content-template'); 
        // TODO: fix problem with multiple {{props}} in one tag
        element.firstChild.textContent = contentTemplate.replaceAll(new RegExp(`{{${bindableKey}}}`, 'g'), value);
    });
}

/**
 * Updates the visibility of an element on the page.
 * @param {HTMLElement} targetElement - The element whose visibility needs to be updated
 * @param {string} value - The value that determines whether the element should be visible or not
 * @return {void}
 */
function sf_model_update_visibility(targetElement, value) {
    if (targetElement.hasAttribute("transparent")) {
        targetElement.style.visibility = value === 'true' ? "visible" : "hidden";
    } else {
        targetElement.style.display = value === 'true'
            ? (targetElement.getAttribute('sf-visibility-display') ?? 'block')
            : 'none';
    }
}

/**
 * Track commands of a model and set event listeners for them within the target element.
 * @param {HTMLElement} targetElement - The target element to track commands within.
 * @param {*} model - The model to track commands for.
 * @return {void}
 */
function sf_model_track_commands(targetElement, model) {
    Object.keys(model).forEach(key => {
        const value = model[key];
        if (value instanceof Function) {
            const commandElements = targetElement.querySelectorAll(`[command="{{${key}}}"]`);
            commandElements.forEach(commandElement => {
                sf_model_set_command_listener(commandElement, model, value);
            });
        }
    });
}

/**
 * Set an event listener for a command on the target element (for another event set 'commandEvent' attribute, default: click).
 * @param {HTMLElement} targetElement - The target element to set the event listener on.
 * @param {*} model - The model to bind the callback function to.
 * @param {function} callbackFunction - The callback function to call when the event is triggered.
 * @return {void}
 */
function sf_model_set_command_listener(targetElement, model, callbackFunction) {
    const listenerEvent = targetElement.getAttribute("commandEvent") ?? "click";
    targetElement.addEventListener(listenerEvent, function () {
        callbackFunction.call(model, {
            element: targetElement,
            commandEvent: listenerEvent
        });
    }, false);
}

/**
 * Track bindings of a model and set event listeners for them within the target element.
 * @param {HTMLElement} targetElement - The target element to track bindings within.
 * @param {*} model - The model to track bindings for.
 * @return {void}
*/
function sf_model_track_bindings(targetElement, model) {
    Object.keys(model).forEach(key => {
      const value = model[key];
      if (!(value instanceof Function)) {
        const bindingElements = targetElement.querySelectorAll(`[bind="{{${key}}}"]`);
        bindingElements.forEach(bindingElement => {
          sf_model_set_binding_listener(bindingElement, model, key);
        });
      }
    });
}

/**
 * Set an event listener for a binding on the target element.
 * @param {HTMLElement} targetElement - The target element to set the event listener on.
 * @param {*} model - The model to update when the event is triggered.
 * @param {string} property - The property of the model to update when the event is triggered.
 * @return {void}
 */
function sf_model_set_binding_listener(targetElement, model, property) {
    const listenerEvent = targetElement.getAttribute("bindEvent") ?? "change";
    targetElement.addEventListener(listenerEvent, function () {
        model[property].set(targetElement.value);
    }, false);
}

/**
 * Creates multiple copies of any template from an array of models.
 * @param {HTMLElement} templateElement - The template element to set the multiplier for.
 * @param {Array} targetArray - The target array of model-object to set as a multiplier.
 * @param {string} [display='block'] - The display style to apply to multiplied elements.
 * @return {void}
 */
function sf_model_set_multiplier(templateElement, targetArray, display = 'block') {
    templateElement.style.display = 'none';

    sf_model_set_multiplier_reset(templateElement);

    Array.from(targetArray).forEach((model, index) => {
        sf_model_set_multiplier_item(model, index);
    });

    targetArray.synchronize = function() {
        sf_model_set_multiplier(templateElement, targetArray, display);
    }
    
    targetArray.push = function(...args) {
        args.forEach((model) => {
            sf_model_set_multiplier_item(model, targetArray.length);
        });
        return Array.prototype.push.apply(this, args);
    };

    targetArray.pop = function(arrayIndex) {
        sf_model_unset_multiplier_template(templateElement, arrayIndex);
        return Array.prototype.pop.apply(this, [arrayIndex]);
    };

    function sf_model_set_multiplier_item(model, arrayIndex) {
        const newElement = sf_model_set_multiplier_template_clone(templateElement, arrayIndex, display);
        sf_model_set_multiplier_model(newElement, model);

        if(sf_model_multiplier_default_functions_allowed) {
            sf_model_set_multiplier_default_functions(model, arrayIndex);
        }
    }

    function sf_model_set_multiplier_default_functions(model, arrayIndex) {
        model.unset = function() {
            sf_model_unset_multiplier_template(templateElement, arrayIndex);
            targetArray.splice(arrayIndex, 1);
        }

        model.getIndex = function() {
            return arrayIndex;
        }

        model.getArray = function() {
            return targetArray;
        }
    }
}

/**
 * Unset a multiplier template from page for the specified array index.
 * @param {HTMLElement} targetElement - The target element to unset the multiplier template for.
 * @param {number} arrayIndex - The array index to unset the multiplier template for, 'sf-template-index' attribute.
 * @return {void}
 */
function sf_model_unset_multiplier_template(targetElement, arrayIndex) {
    targetElement.parentElement.querySelectorAll(`[sf-template-index="${arrayIndex}"]`).forEach(element => {
        element.remove();
    });
}

/**
 * Set a model for a multiplier template element.
 * @param {HTMLElement} templateElement - The template element to set the model for.
 * @param {*} model - The model to set for the template element.
 * @return {void}
 */
function sf_model_set_multiplier_model(templateElement, model) {
    sf_model_set(templateElement, model);
    templateElement.model = model;
}

/**
 * Clone a multiplier template element and set its index, display style.
 * @param {HTMLElement} templateElement - The template element to clone.
 * @param {number} index - The index to set for the cloned element.
 * @param {string} display - The display style to apply to the cloned element.
 * @return {HTMLElement} The cloned template element.
 */
function sf_model_set_multiplier_template_clone(templateElement, index, display) {
    const newElement = templateElement.cloneNode(true);
    newElement.setAttribute('sf-template-index', index);
    newElement.style.display = display;
    templateElement.parentNode.appendChild(newElement);
    const newName = `${newElement.getAttribute('template')}-${sf_random_string()}`;
    newElement.setAttribute('template', newName);
    return newElement;
}

/**
 * Reset a multiplier by removing all cloned elements.
 * @param {HTMLElement} targetElement - The target element to reset the multiplier for.
 * @return {void}
 */
function sf_model_set_multiplier_reset(targetElement) {
    targetElement.parentNode.querySelectorAll(`[sf-template-index]`).forEach(element => {
        element.remove();
    });
}


/*
    DEPARTMENT -> DATA EXCHANGE
*/

/**
 * Retrieves a shared point object by its name from sf_point_shared_objects variable.
 * @param {string} name - The name of the shared point to retrieve.
 * @returns {Object} The shared point object with subscribe, unsubscribe, and share methods.
 */
function sf_point_get(name) {
    return sf_point_shared_objects[name];
}

/**
 * Creates a shared point object for other code members to subscribe to and listen to.
 * @param {string} [name=null] - The name of the point to be shared.
 * @returns {Object} The point object with subscribe(keyContext, callback), unsubscribe(keyContext), and share(data) methods.
 */
function sf_point_set(name = null) {
    const point = {
        _subscriptions: [],

        subscribe(keyContext, callback) {
            this._subscriptions[keyContext] = {callback, keyContext};
        },
        unsubscribe(keyContext) {
            delete this._subscriptions[keyContext];
        },
        share(data) {
            Object.values(this._subscriptions)
                .forEach(({callback, keyContext}) => callback.call(keyContext, data));
        }
    };

    if(name) {
        sf_point_shared_objects[name] = point;
    }

    return point;
}


/*
    DEPARTMENT -> STATE MANAGER
*/

/**
 * Gets the value of a state by name.
 * @param {string} name - The name of the state to get.
 * @return {*} The value of the state from localStorage if it exists, otherwise from states.
 */
function sf_state_get(name) {
    return localStorage.getItem(sf_state_ls_prefix + name) ?? sf_states[name];
}

/**
 * Sets the value of a state by name.
 * @param {string} name - The name of the state to set.
 * @param {*} value - The value to set for the state.
 * @param {boolean} [setLocalStorage=false] - Whether to set the value in localStorage as well.
 * @return {void}
 */
function sf_state_set(name, value, setLocalStorage = false) {
    sf_states[name] = value;

    if(setLocalStorage) {
        localStorage.setItem(sf_state_ls_prefix + name, value);
    }
}

/**
 * Unsets a state by name.
 * @param {string} name - The name of the state to unset.
 * @return {void}
 */
function sf_state_unset(name) {
    delete sf_states[name];
    localStorage.removeItem(sf_state_ls_prefix + name);
}


/*
    DEPARTMENT -> OTHER UTILS
*/

/**
 * Generates a random string of 9 characters.
 * @returns {string} A random string of 9 characters.
 */
function sf_random_string() {
    return Math.random().toString(36).slice(2, 11);
}

/**
 * Pauses the execution of code for a specified amount of time.
 * @param {number} milliseconds - The number of milliseconds to pause execution.
 */
function sf_sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

/**
 * Evaluates an XPath expression and returns the result as an ordered snapshot of nodes.
 * @param {Node} targetElement - The context node for the XPath expression.
 * @param {string} xpathExpression - The XPath expression to evaluate.
 * @returns {XPathResult} An XPathResult object of type ORDERED_NODE_SNAPSHOT_TYPE.
 */
function sf_xpath_find(targetElement, xpathExpression) {
    return document.evaluate(xpathExpression, targetElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
}

/**
 * Generates an XPath expression for a given element.
 * @param {Element} element - The element for which to generate the XPath expression.
 * @param {string} xpath - The initial XPath expression (optional).
 * @returns {string} An XPath expression that uniquely identifies the given element.
 */
function sf_xpath_element(element, xpath = '') {
    while (element && element.nodeType === 1) {
        let index = 1;
        for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
            if (sibling.nodeType !== Node.DOCUMENT_TYPE_NODE && sibling.nodeName === element.nodeName) {
                ++index;
            }
        }
        xpath = `/${element.nodeName}[${index}]` + xpath;
        element = element.parentNode;
    }
    return xpath;
}

/**
 * Calculates a hash code for a text string.
 * @param {string} text - The text string for which the hash code is calculated.
 * @returns {string} The hash code as a string in base 36.
 */
function sf_hash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash = hash & hash;
    }
    return hash.toString(36);
}