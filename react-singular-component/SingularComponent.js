import PropTypes from 'prop-types';
import {Children, Component} from 'react';
import {findDOMNode} from 'react-dom';



const keyToComponentsObject = {};

const getComponentsObject = (key) => {
    if(!keyToComponentsObject[key]) keyToComponentsObject[key] = { components: [] };
    return keyToComponentsObject[key];
};

const getComponents = (key) => getComponentsObject(key).components;

const getPriorities = (key) => getComponents(key).map(({props}) => props.singularPriority);

const forceUpdateComponents = (key) => getComponents(key).forEach(component => component.forceUpdate());


const registerComponent = (component) => {
    const key = component.props.singularKey;
    const keyComponents = getComponents(key);

    keyComponents.push(component);
    forceUpdateComponents(key);
};

const unregisterComponent = (component) => {
    const key = component.props.singularKey;
    const keyComponents = getComponents(key);
    const index = keyComponents.indexOf(component);

    if(index !== -1){
        keyComponents.splice(index, 1);
        forceUpdateComponents(key);
    }
};


const setLastRect = (key, rect) => getComponentsObject(key).lastRect = rect;

const getLastRect = (key) => getComponentsObject(key).lastRect;


const shouldShow = (component) => {
    const {singularKey, singularPriority} = component.props;
    return Math.max(...getPriorities(singularKey)) === singularPriority;
};


const createAnimationElement = (element) => {
    const animationElement = element.cloneNode(true);

    animationElement.style.position = 'fixed';
    animationElement.style.transformOrigin = 'left top';
    animationElement.style.transition = 'none';
    animationElement.style.marginLeft = 0;
    animationElement.style.marginTop = 0;
    animationElement.style.marginRight = 0;
    animationElement.style.marginBottom = 0;

    document.body.appendChild(animationElement);
    return animationElement;
};

const animateElement = (animationElement, startingRect, targetElement, duration, onFinish) => {
    let startingTimestamp;

    const step = (timestamp) => {
        startingTimestamp = startingTimestamp ? startingTimestamp : timestamp;
        const progress = timestamp - startingTimestamp;

        if(progress < duration){
            requestAnimationFrame(step);

            const valueFormula = (startValue, endValue) => startValue + (endValue - startValue) * (progress/duration);
            const targetRect = targetElement.getBoundingClientRect();

            const scaleX = valueFormula((startingRect.width/targetRect.width), 1);
            const scaleY = valueFormula((startingRect.height/targetRect.height), 1);
            const translateX = valueFormula((startingRect.left - targetRect.left), 0);
            const translateY = valueFormula((startingRect.top - targetRect.top), 0);


            animationElement.style.left = `${targetRect.left}px`;
            animationElement.style.top = `${targetRect.top}px`;
            animationElement.style.width = `${targetRect.width}px`;
            animationElement.style.height = `${targetRect.height}px`;
            animationElement.style.transform = `translate(${translateX}px,${translateY}px) scale(${scaleX},${scaleY})`;
        }
        else{
            onFinish();
        }

    };

    requestAnimationFrame(step);
};

const rectsAreTheSame = (rect1,rect2) => {
    for(let prop in rect1){
        if(rect1[prop] != rect2[prop]){
            return false;
        }
    }
    return true;
};

class SingularComponent extends Component{


    animateComponent(){
        const {animationDuration, singularKey} = this.props;
        const lastRect = getLastRect(singularKey);

        if(lastRect){
            const animationElement = createAnimationElement(this.element);

            this.element.style.opacity = 0;
            animateElement(animationElement, lastRect, this.element, animationDuration, () => {
                animationElement.remove();
                if(this.element){
                    this.element.style.opacity = '';
                    setLastRect(singularKey, this.element.getBoundingClientRect());
                }
            });
        }
    }

    componentWillUpdate(){
       if(this.element)    setLastRect(this.props.singularKey, this.element.getBoundingClientRect());
    }

    componentDidUpdate(){
        const {singularKey} = this.props;
        const element = findDOMNode(this);

        if(this.element !== element){
            this.element = element;

            if (this.element)   this.animateComponent();
        }
        else if(this.element && !rectsAreTheSame(this.element.getBoundingClientRect(), getLastRect(singularKey))){
            this.animateComponent();
        }
    }

    componentDidMount(){
        registerComponent(this);
    }

    componentWillUnmount(){
        if(this.element)    setLastRect(this.props.singularKey, this.element.getBoundingClientRect());
        unregisterComponent(this);
    }

    render(){
        const {children} = this.props;
        return shouldShow(this) ? Children.only(children) : null;
    }
}

SingularComponent.propTypes = {
    singularKey: PropTypes.string.isRequired,
    singularPriority: PropTypes.number.isRequired,
    animationDuration: PropTypes.number
};

SingularComponent.defaultProps = {
    animationDuration: 300
};

export default SingularComponent;