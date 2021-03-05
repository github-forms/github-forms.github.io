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

let octokit;

function parseHash() {
    const [owner, repo] = location.hash.slice(1).split('/');
    return { owner, repo };
}
 
class App extends React.Component {

  state = {
    error: null,

    loading: false,
    submit: false,
    done: false,

    title: null,
    fields: null,
    user: null,
    octokit: null,
  }

  componentWillUnmount() {
    window.removeEventListener("hashchange", this.handleOpenForm.bind(this), false);
  }
  
  componentDidMount() {
    window.addEventListener("hashchange", this.handleOpenForm.bind(this), false);

    this.setState({ loading: true });

    firebase
      .auth()
      .onAuthStateChanged(async (user) => {
        const cookie = document.cookie.split(';').filter((c) => c.trim().startsWith('_GH_TOKEN='))[0]?.split('=')[1];
        if (user && cookie) {
          const [id, username, token] = cookie.split(':');
          if (user.providerData[0].uid != id) {
            document.cookie = "_GH_TOKEN= ; expires = Thu, 01 Jan 1970 00:00:00 GMT";
            return;
          }

          octokit = new Octokit({ auth: token });
          this.setState({ octokit, user });

          await this.handleOpenForm();

        } else {
          document.cookie = "_GH_TOKEN= ; expires = Thu, 01 Jan 1970 00:00:00 GMT";
        }
      });
  }

  handleLogin(e) {
    firebase
      .auth()
      .signInWithPopup(provider)
      .then(({ additionalUserInfo: { username, profile: { id } }, credential: { accessToken } }) => {
        document.cookie = `_GH_TOKEN=${id}:${username}:${accessToken}; path=/; domain=${location.hostname}; ${location.protocol === 'https:' ? 'secure;' : ''} samesite=strict`;
      }).catch((error) => {
        const errorMessage = error.message;
        console.log(errorMessage)
      });
  }

  async handleOpenForm() {
    this.setState({ loading: true });
    const { owner, repo } = parseHash();
    try {
      const resp = await octokit.repos.getContent({
        owner,
        repo,
        path: '.forms.yml',
      })

      const { title, fields } = yaml.load(atob(resp.data.content));
      this.setState({ owner, repo, title, fields, loading: false });
    } catch (error) {
      console.log(error);
      this.setState({ owner, repo, error: 'Form not found.', title: null, fields: null, loading: false });
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    const { owner, repo } = this.state;

    this.setState({ submit: true });

    const formData = new FormData(e.target);
    const object = {};
    formData.forEach((value, key) => object[key] = value);

    const issue = await octokit.issues.create({
      owner,
      repo,
      title: `Octo Forms: ${new Date().toISOString()}`,
      body: JSON.stringify(object),
      labels: ['octo-forms'],
    });

    const number = issue.data.number;

    const getIssue = async () => {
      const issue = await octokit.issues.get({
        owner,
        repo,
        issue_number: number,
        headers: {
          'If-None-Match': ''
        }
      });
      if (issue.data.state === 'closed') {
        this.setState({ done: true });
      } else {
        setTimeout(getIssue, 3000);
      }
    };
    setTimeout(getIssue, 15000);
  }

  render() {
    const { error, loading, done, submit, user, title, fields } = this.state;
    console.log({ error, loading, done, submit, user, title, fields })
    if (error !== null) {
      return (<p>{ error }</p>);
    } else if (loading) {
      return (<p>Loading...</p>);
    } else if (user === null) {
      return (<a onClick={this.handleLogin}>Log-in with Github</a>);
    } else if (done) {
      return (<p>Done!</p>);
    } else {
      return (
        <>
          <h1>{ title }</h1>
          <form action="#" onSubmit={this.handleSubmit.bind(this)}>
          {
            fields.map(
              f =>
                <div key={f.name}> 
                  {f.label} <input name={f.name} />
                </div>
            )
          }
          <input type="submit" disabled={submit} />
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