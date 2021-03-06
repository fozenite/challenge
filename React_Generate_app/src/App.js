import _ from 'lodash';
import React, { Component } from 'react';
import CreateTodo from './components/Create-todo.js'
import TodosList from './components/Todos-list.js'
import './App.css';

const io = require('socket.io-client')
const socket = io.connect('http://localhost:3003/');

const todos = [];

let serverConnecLost = false;

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      todos //ES6 syntax like todos:todos
    };
  }

  componentDidMount() {

    socket.on('connect', (data) => {
      socket.emit('join', 'Hello World from client');
    });

    socket.on('disconnect', (data) => {

      serverConnecLost = true;
    });

    let loadToDos = (todo) => {
      this.state.todos.push({
        task: todo.task,
        isCompleted: todo.isCompleted
      });
      this.setState({
        todos: this.state.todos
      });
    }

    socket.on('load', (todos) => {
      // Cater to initial DB to-do list load
      if (serverConnecLost) {
        this.setState({
          todos: []
        }); //Clear to-dos on disconnect
        serverConnecLost = false;
      }

      if (Array.isArray(todos)) {
        todos.forEach((todo) => loadToDos(todo));
      } else { //ELSE RENDER ONE TO-DO
        loadToDos(todos);
      }

    });

    // Handling incoming task CONTENT update broadcast
    socket.on('incomingtaskUpdateContent', (contentUpdateIncoming) => {
      const foundTodo = _.find(this.state.todos, todo => todo.task === contentUpdateIncoming.oldTask);
      foundTodo.task = contentUpdateIncoming.newTask;
      this.setState({
        todos: this.state.todos
      });
    });

    // Handling incoming task STATUS update broadcast - status
    socket.on('incomingtaskUpdateStatus', (todoIncoming) => {
      const foundTodo = _.find(this.state.todos, todo => todo.task === todoIncoming.task);
      foundTodo.isCompleted = todoIncoming.isCompleted;
      this.setState({
        todos: this.state.todos
      });
    });

    // Handling incoming task delete broadcast
    socket.on('incomingtaskDelete', (todoIncomingDelete) => {
      _.remove(this.state.todos, todo => todo.task === todoIncomingDelete);
      this.setState({
        todos: this.state.todos
      });
    });


  }


  render() {
    return (
      <div className="App">
        <h1>Welcome to the TO DO list App</h1>
        <button className="completeAllButton" onClick={this.handleCompleteAll.bind(this)}>Mark all tasks as completed</button>
        <button className="completeAllButton" onClick={this.handleDeleteAll.bind(this)}>Delete all tasks</button>
        <CreateTodo createTask={this.createTask.bind(this)}
                    todos={this.state.todos}
        />
        <TodosList  todos={this.state.todos}
                    toggleTask={this.toggleTask.bind(this)}
                    saveTask={this.saveTask.bind(this)}
                    deleteTask={this.deleteTask.bind(this)}
        />
      </div>
    );
  }

  // Complete all tasks Function
  handleDeleteAll = () => {
    this.state.todos.forEach((todo) => {
      socket.emit('taskDelete', {
        task: todo.task
      });
    });
    this.setState({
      todos: []
    }); //Delete all to-dos from state
  }
  // Complete all tasks Function
  handleCompleteAll = () => {
    _.map(this.state.todos, (todo) => todo.isCompleted = true);
    this.state.todos.forEach((todo) => {
      socket.emit('taskUpdateStatus', {
        task: todo.task,
        isCompleted: todo.isCompleted
      });
    });
    this.setState({
      todos: this.state.todos
    });
  }

  toggleTask = (task) => {
    const foundTodo = _.find(this.state.todos, todo => todo.task === task);
    foundTodo.isCompleted = !foundTodo.isCompleted;
    socket.emit('taskUpdateStatus', {
      task: task,
      isCompleted: foundTodo.isCompleted
    });
    this.setState({
      todos: this.state.todos
    });
  }

  createTask = (task) => {
    this.state.todos.push({
      task,
      isCompleted: false
    });
    // Send to sockets.io to broadcast to-do to all and store in server memory
    socket.emit('make', {
      task: task,
      isCompleted: false
    });
    this.setState({
      todos: this.state.todos
    });
  }
  // Saves new task to state and sends change update to Server to handle
  saveTask = (oldTask, newTask) => {
    const foundTodo = _.find(this.state.todos, todo => todo.task === oldTask);
    foundTodo.task = newTask;
    socket.emit('taskUpdateContent', {
      oldTask: oldTask,
      newTask: newTask
    });
    this.setState({
      todos: this.state.todos
    });
  }
  //Delete Task - deletes specific task chosen by the user
  deleteTask = (taskToDelete) => {
    _.remove(this.state.todos, todo => todo.task === taskToDelete);
    socket.emit('taskDelete', {
      task: taskToDelete
    });
    this.setState({
      todos: this.state.todos
    });
  }
}

export default App;