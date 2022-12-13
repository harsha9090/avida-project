import './App.css'
import React, { useState } from 'react';

import { makeStyles } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import { LineChart, Line, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from "recharts";
import Paper from '@material-ui/core/Paper'
import avdheader from './assets/Logo-large-WHT.png'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'

var math = require('mathjs');

var client = null
client = new WebSocket('wss://demo.piesocket.com/v3/channel_1?api_key=VCXCEuvhGcBDP7XhiJJUDvR1e1D3eiVjgZ9VRiaV&notify_self');

var hello_world_msg_count=0, diff_word_count=0
var current_value=0, previous_value=0, td=0, td_STD=0, td_avg=0
var is_connected=0
var unknown_data=''
const STD_buf_size=10
var dat_array=[]

// Project Stats Media Card
const projectStatsStyles = makeStyles({
  root: {
    maxWidth: 800,
    display: 'inline-flex',
    marginLeft: '30px',
  }
});

function ProjectStats(props) {
  const classes = projectStatsStyles();

  return (
    <Card className={classes.root}>
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2">
          Project Statistics
        </Typography>
        <p> Hello World Messages: {hello_world_msg_count}</p>
        <p> Time from Last Message[ms]: {td}</p>
        <p> Average Time between Messages[ms]: {td_avg}</p>
        <p> STD between Messages[ms]: {td_STD}</p>
      </CardContent>
    </Card>
  );
}
// End of Project Stats Media Card

// Unknown data Media Card
const unknownDataStyles = makeStyles({
  root: {
    maxWidth: 800,
    display: 'inline-flex',
    marginLeft: '30px',
  }
});

function UnknownDataStats(props) {
  const classes = unknownDataStyles();

  return (
    <Card className={classes.root}>
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2">
          Unknown Data Tab
        </Typography>
        <p> Unknown Data: {unknown_data}</p>
        <p> Unknown Data Count: {diff_word_count}</p>
      </CardContent>
    </Card>
  );
}
// End of unknown data Media Card

// AppBar
const appBarStyles = makeStyles(theme => ({
  myImage: {
    height: '40px',
    marginRight: 10,
  },
  header: {
    backgroundColor: '#C4F0F4',
    position: 'relative',
    marginBottom: '1em',
  },
}))


function DenseAppBar(props) {
  const classes = appBarStyles()

  return (
    <AppBar className={classes.header}>
      <Toolbar>
        <img src={avdheader} className={classes.myImage} alt="avida-header"/>
        <Typography variant='h6'> Avida Project - WebSockets</Typography>
      </Toolbar>
    </AppBar>
  )
} // End of AppBar

// Here we keep latest 50 data points and remove the first data point
// This way we display the latest 50 data points on the run chart
function limitData(currentData, message) {
  if (currentData.length > 50) {
    currentData.shift();
  }
  return [
    ...currentData,
    {
      td_samples: message,
    },
  ];
}

// Here we keep latest 10 data points to calculate the standard deviation
function tDBuffer(incomingDataBuf, message){
  incomingDataBuf = [...incomingDataBuf, message]
  if(incomingDataBuf.length > STD_buf_size){
    incomingDataBuf.shift()
  }
  return incomingDataBuf
}

// Main App
function App() {

  const[data, setData] = useState([])

  function connect() {

  if(is_connected === 0){
    client = new WebSocket('wss://demo.piesocket.com/v3/channel_1?api_key=VCXCEuvhGcBDP7XhiJJUDvR1e1D3eiVjgZ9VRiaV&notify_self');
    is_connected = 1
  }

    client.onopen = function() {
      console.log('Client Connected!')
    }
  
    client.onmessage = function(message) {
      if (message.data === "Hello world!") {
        hello_world_msg_count++
      }else{
        diff_word_count++
        unknown_data = message.data
      }

      // Calculate time difference between messages
      current_value = message.timeStamp;
      td = current_value - previous_value;
      previous_value = current_value;

      //console.log('Message:', message.data, hello_world_msg_count, diff_word_count, td)
      setData((currentData) => limitData(currentData, td));
      td = td.toFixed(2);

      // Calcualte the standard deviation between messages
      dat_array = tDBuffer(dat_array, td)
      if(dat_array.length === STD_buf_size){
        td_STD = math.std(dat_array)
        td_STD = td_STD.toFixed(2)
        td_avg = math.mean(dat_array)
        td_avg = td_avg.toFixed(2)
      }

    }
  
    // Handle the websocket connection failures like disconnects
    client.onclose = function(message) {
      console.log('WebSocket connection is closed. Reconnect will be attempted in 5 second.', message.reason)
      is_connected = 0
      setTimeout(function() {
      connect()
      }, 5000)
    }
    
    // Close websocket connection if there is an error
    client.onerror = function(error) {
      console.error('WebSocket error: ', error.message, 'Closing WebSocket connection...')
      client.close()
    }
  }

  connect();

  return (
      <div className='avida-app-main'>
        <DenseAppBar />
        <Paper style={{margin:'0px', marginLeft: 'auto', marginRight: 'auto', padding:'20px', maxWidth:'1600px', Height:'auto'}} >
        
        <div style={{ width: 1500, height: 400, padding:'20px' }}>
          <ResponsiveContainer>
            <LineChart
              width={800}
              height={400}
              data={data}
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="td_samples"
                stroke="#8884d8"
                activeDot={{ r: 10 }}
                strokeWidth="3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        </Paper>

        <div style={{ marginLeft: '90px', width: 1500, height: 'auto', padding:'20px' }}>
        <ProjectStats />
        <UnknownDataStats />
        </div>
      </div>
  )
}

export default App
