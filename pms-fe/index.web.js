import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('PMSFrontend', () => App);
AppRegistry.runApplication('PMSFrontend', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});