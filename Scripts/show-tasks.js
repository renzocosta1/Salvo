#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgRed: '\x1b[41m',
};

const statusSymbols = {
  done: '✅',
  pending: '⏳',
  'in-progress': '🔄',
};

const statusColors = {
  done: colors.green,
  pending: colors.yellow,
  'in-progress': colors.cyan,
};

function loadTasks() {
  const tasksPath = path.join(__dirname, '../.taskmaster/tasks/tasks.json');
  const data = fs.readFileSync(tasksPath, 'utf8');
  return JSON.parse(data);
}

function drawBox(title, content, color = colors.cyan) {
  const width = 80;
  const line = '═'.repeat(width - 2);
  
  console.log(color + '╔' + line + '╗' + colors.reset);
  console.log(color + '║' + colors.reset + colors.bright + ` ${title}`.padEnd(width - 1) + color + '║' + colors.reset);
  console.log(color + '╠' + line + '╣' + colors.reset);
  
  content.split('\n').forEach(line => {
    const paddedLine = ` ${line}`.padEnd(width - 1);
    console.log(color + '║' + colors.reset + paddedLine + color + '║' + colors.reset);
  });
  
  console.log(color + '╚' + line + '╝' + colors.reset);
}

function getProgressBar(completed, total, width = 40) {
  const percentage = Math.round((completed / total) * 100);
  const filled = Math.round((completed / total) * width);
  const empty = width - filled;
  
  const bar = colors.bgGreen + ' '.repeat(filled) + colors.reset + 
              colors.gray + '░'.repeat(empty) + colors.reset;
  
  return `${bar} ${percentage}%`;
}

function displayTasks() {
  const data = loadTasks();
  const tasks = data.master.tasks;
  
  // Calculate overall progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  
  // Header
  console.log('\n');
  drawBox('🎯 SALVO PROJECT - TASK PROGRESS', 
    `Total Tasks: ${totalTasks} | Completed: ${completedTasks} | Remaining: ${totalTasks - completedTasks}\n` +
    `\n` +
    `Progress: ${getProgressBar(completedTasks, totalTasks)}`,
    colors.magenta
  );
  
  console.log('\n');
  
  // Display each task
  tasks.forEach((task, index) => {
    const symbol = statusSymbols[task.status] || '❓';
    const color = statusColors[task.status] || colors.white;
    const statusText = task.status.toUpperCase().padEnd(12);
    
    console.log(colors.bright + `${symbol} Task ${task.id}: ${task.title}` + colors.reset);
    console.log(colors.gray + `   ${task.description}` + colors.reset);
    console.log(`   Status: ${color}${statusText}${colors.reset} | Priority: ${task.priority}`);
    
    // Show subtasks if any
    if (task.subtasks && task.subtasks.length > 0) {
      const completedSubs = task.subtasks.filter(s => s.status === 'done').length;
      const totalSubs = task.subtasks.length;
      
      console.log(colors.cyan + `   Subtasks: ${completedSubs}/${totalSubs} completed` + colors.reset);
      
      task.subtasks.forEach(subtask => {
        const subSymbol = statusSymbols[subtask.status] || '❓';
        const subColor = statusColors[subtask.status] || colors.white;
        console.log(`     ${subSymbol} ${subColor}${subtask.id}. ${subtask.title}${colors.reset}`);
      });
    }
    
    console.log(colors.gray + '   ' + '─'.repeat(76) + colors.reset);
  });
  
  // Current focus
  const currentTask = tasks.find(t => t.status !== 'done' && t.status !== 'pending');
  if (currentTask) {
    console.log('\n');
    drawBox('🔥 CURRENT FOCUS', 
      `Task ${currentTask.id}: ${currentTask.title}\n` +
      `Status: ${currentTask.status.toUpperCase()}\n` +
      `\n` +
      `${currentTask.details}`,
      colors.yellow
    );
  }
  
  // Next up
  const nextTask = tasks.find(t => t.status === 'pending');
  if (nextTask) {
    console.log('\n');
    drawBox('⏭️  NEXT UP', 
      `Task ${nextTask.id}: ${nextTask.title}\n` +
      `\n` +
      `${nextTask.description}`,
      colors.blue
    );
  }
  
  console.log('\n');
}

// Run
try {
  displayTasks();
} catch (error) {
  console.error(colors.red + '❌ Error loading tasks:' + colors.reset, error.message);
  process.exit(1);
}
