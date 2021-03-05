import 'file-loader?name=[name].[ext]!./index.html';
import yaml from 'js-yaml';
import { Octokit } from '@octokit/rest';
import React from 'react';
import ReactDOM from 'react-dom';
import firebase from 'firebase';

const firebaseConfig = {
  apiKey: "AIzaSyBQrSkQNBxwzZZs4qXM9mCsygbLOAZ3Z74",
  authDomain: "octo-forms.firebaseapp.com",
  projectId: "octo-forms",
  storageBucket: "octo-forms.appspot.com",
  messagingSenderId: "303355345270",
  appId: "1:303355345270:web:f26a58873ca43010fe6257",
  measurementId: "G-QDYPMMY75J"
};

firebase.initializeApp(firebaseConfig);
const provider = new firebase.auth.GithubAuthProvider();
provider.addScope('repo');

 
class App extends React.Component {

  state = {
    title: null,
    fields: null
  }
  
  componentDidMount() {
    firebase
      .auth()
      .signInWithPopup(provider)
      .then((result) => {
        const credential = result.credential;
        const token = credential.accessToken;
        const octokit = new Octokit({ auth: token });
        octokit.repos.getContent({
          owner: 'octo-forms',
          repo: 'example',
          path: '.forms.yml',
        })
          .then(
            resp => {
              const content = yaml.load(atob(resp.data.content));
              console.log(content);
              this.setState(content);
            }
          );
      }).catch((error) => {
        const errorMessage = error.message;
        console.log(errorMessage)
      });
  }

  render() {
    const { title, fields } = this.state;
    if (title === null || fields === null) {
      return (<p>Loading...</p>);
    } else {
      return (
        <>
          <h1>{ title }</h1>
          <form>
          {
            fields.map(
              f =>
                <div key={f.name}> 
                  {f.label} <input name={f.name} />
                </div>
            )
          }
          <input type="submit" />
          </form>
        </>
      )
    }
  }

}

ReactDOM.render(
  <App />,
  document.body
);