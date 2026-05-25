package com.example.todo.controller;

import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tasks")
@CrossOrigin("*")
public class TodoController {

    @Autowired
    private TodoRepository repository;

    // ADD TASK
    @PostMapping
    public Todo addTask(@RequestBody Todo todo) {
        return repository.save(todo);
    }

    // VIEW ALL TASKS
    @GetMapping
    public List<Todo> getTasks() {
        return repository.findAll();
    }

    // VIEW SINGLE TASK
    @GetMapping("/{id}")
    public Todo getTaskById(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found with id: " + id));
    }

    // UPDATE TASK
    @PutMapping("/{id}")
    public Todo updateTask(@PathVariable Long id, @RequestBody Todo todoDetails) {
        Todo todo = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found with id: " + id));
        todo.setTask(todoDetails.getTask());
        todo.setCompleted(todoDetails.isCompleted());
        return repository.save(todo);
    }

    // DELETE TASK
    @DeleteMapping("/{id}")
    public String deleteTask(@PathVariable Long id) {
        repository.deleteById(id);
        return "Task Deleted Successfully";
    }
}



