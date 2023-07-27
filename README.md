# Satisfaction.JS - free to use
1. **Satisfaction** allows you to connect it directly without additional tools.
2. You can use classical and MVVM approaches. SF provides functionality for working with properties and commands.
3. SF provides flexible page navigation and lazy loading of components, which allows you to create large applications from various components.

## SF allows you to easily create large SPAs and other applications
1. Download the `satisfaction.js` file from the repository.
2. Copy and paste the following code into your HTML file:
```html
<script type="text/javascript" src="/satisfaction.js"></script>
```
## Usage

To initialize the `sf` library and ensure correct routing, use the following code in your HTML file:

```html
<body onload="sf_initialize()" allow-routing>
```

## Routing

You can set up the following routes in the `head` of your HTML file:
```html
<route path="/" navigation-component-name="home"></route>
<route path="/home" navigation-component-name="home"></route>
<route path="/profile" navigation-component-name="profile"></route>
<route path="/default" navigation-component-name="default" default></route>
```
The `default` attribute displays the component that should be shown when SF cannot find the path.

## Components

To set up components, use the following code in your HTML file:

```html
<div navigation-switch>
    <component src="/views/components/default/default.html" name="default"></component>
    <component src="/views/components/home/home.html" name="home"></component>
    <component src="/views/components/profile/profile.html" name="profile"></component>
</div>
```
The `navigation-switch` attribute sets the parent container as the component switcher. The component that was navigated to is displayed.
Multiple components in different places in your application are allowed. Components with the `default` attribute are loaded automatically.

## Component Implementation - simplified approach

You can also use a simplified approach without using models and MVVM:
`<button name="open-button">Open some thing</button>`
```javascript
const button = component.find("open-button");
button.onclick = function() {
    otherComponent.load();
    //TODO: any action with HTML element
}
```
The word `component` is a keyword. See documentation.

## Component Implementation - MVVM approach

Below is an example of a component using the MVVM approach:

```html
<script>
component.setModel({
    sharedPoint: component.inputData,
    count: 0,
    name: "User",
    message: "...",

    sendMessageCommand: function(eventInfo) {
        if(this.name.value.length > 0 && this.message.value.length > 0) {
            this.sharedPoint.value.share({
                sender: this.name.value,
                message: this.message.value
            });

            this.count.value++;
            this.message.value = "";
        }
    }
}, 'message-form');
</script>

<div class="component" template="message-form">
    <span>Messages sent: {{count}} by <b>{{name}}</b></span>
    <div class="box">
        <strong>Name: </strong>
        <input placeholder="Your name.." value="{{name}}" bind="{{name}}"
            bindEvent="input" title="User = {{name}}" name="name-field">
    </div>
    <div class="box">
        <strong>Message: </strong>
        <input placeholder="Any text.." value="{{message}}" bind="{{message}}" title="Message = {{message}}" name="message-field">
    </div>
    <button name="sendButton" command="{{sendMessageCommand}}" name="message-button">Send message</button>
</div>

<style>
.component {
    border: 1px solid #000;
    padding: 20px;
    font-size: 18px;
    width: 400px;
}

.component * {
    margin-top: 10px;
}

.box strong {
    display: inline-block;
}
</style>
```

## Component Multiplication

To multiply components, use the `component.setMultiplier(yourArray, 'template-of-message')` function. Satisfaction will apply the template for each model in the array.
```html
<div class="component" template="message-list">
    <div class="message" template="template-of-message">
        <button class="close-button" command="{{close}}">Close</button>
        <span class="message-sender" title="{{sender}}">{{sender}}</span>
        <span class="message-text" title="{{message}}">{{message}}</span>
    </div>
</div>
```

## Working with Data

Use `component.inputData` in the child component to receive data from the `component.load(true, data)` function.


Function `sf_point_get` creates a shared point object for other code members to subscribe to and listen to.
Use `subscribe(keyContext, callback)`, `unsubscribe(keyContext)` and `share(data)` methods:
```javascript
sharedPoint: sf_point_set(),
component.find("message-list").load(true, this.sharedPoint.value);
```
Subscription code:
```javascript
construct: function() {
        this.sharedPoint.value.subscribe(this, this.registerMessage);
}
```

## Postscriptum
Thanks for using. If you have a question or suggestion, please post it in the `issues` section.
