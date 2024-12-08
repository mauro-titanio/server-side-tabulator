import { useSessionStorage } from "@uidotdev/usehooks";
import { useEffect, useRef, useState } from "react";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  CellComponent,
  TabulatorFull as Tabulator,
  TabulatorFull,
} from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator_bootstrap5.min.css";
import apiClient from "./apiClient";

// Login Component
function Login({
  setIsLoggedIn,
}: {
  setIsLoggedIn: (loggedIn: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      const { accessToken, refreshToken } = response.data;

      // Store tokens in sessionStorage
      sessionStorage.setItem("accessToken", accessToken);
      sessionStorage.setItem("refreshToken", refreshToken);

      setIsLoggedIn(true);
      navigate("/tasks"); // Redirect to tasks page
    } catch (error) {
      console.error("Error logging in:", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ marginBottom: "20px" }}>
      <h2>Login</h2>
      <div>
        <label>
          Email:
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Password:
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
      </div>
      <button type='submit'>Login</button>
    </form>
  );
}

// Tasks Component
function Tasks({ handleLogout }: { handleLogout: () => void }) {
  const tableRef = useRef<TabulatorFull | null>(null);
  const [taskName, setTaskName] = useState("");

  const handleTaskCreation = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!taskName.trim()) {
      alert("Task name cannot be empty");
      return;
    }

    try {
      const response = await apiClient.post("/tasks", {
        name: taskName,
        done: false,
      });

      const newTask = response.data;
      console.log("New task created:", newTask);
      setTaskName("");

      // Refresh the table data
      if (tableRef.current) {
        tableRef.current.setData();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleCellClick = async (e: UIEvent, cell: CellComponent) => {
    if (cell.getColumn().getField() === "done") {
      const taskId = cell.getRow().getData().id;
      const currentDone = cell.getValue();
      const newDone = !currentDone;

      try {
        const response = await apiClient.patch(`/tasks/${taskId}`, {
          done: newDone,
        });

        const updatedTask = response.data;
        console.log("Task updated:", updatedTask);

        // Update the table cell
        cell.setValue(newDone);
      } catch (error) {
        console.error("Error updating task:", error);
      }
    }
  };

  useEffect(() => {
    const table = new Tabulator(`#table`, {
      height: 500,
      ajaxURL: "api/tasks",
      ajaxConfig: {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
        },
      },
      pagination: true,
      layout: "fitColumns",
      columns: [
        { title: "ID", field: "id", width: 100, hozAlign: "center" },
        { title: "Name", field: "name", width: 200 },
        {
          title: "Done",
          field: "done",
          hozAlign: "center",
          formatter: "tickCross",
          cellClick: handleCellClick,
        },
        {
          title: "Created At",
          field: "createdAt",
          sorter: "datetime",
          hozAlign: "center",
        },
        {
          title: "Updated At",
          field: "updatedAt",
          sorter: "datetime",
          hozAlign: "center",
        },
      ],
    });

    tableRef.current = table;
  }, []);

  return (
    <div>
      <button onClick={handleLogout} style={{ marginBottom: "20px" }}>
        Logout
      </button>
      <form onSubmit={handleTaskCreation} style={{ marginBottom: "20px" }}>
        <label style={{ display: "block" }}>
          Task Name:
          <input
            type='text'
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder='Enter task name'
            required
          />
        </label>
        <button type='submit'>Create Task</button>
      </form>
      <div id='table' />
    </div>
  );
}

// App Component
function App() {
  const [isLoggedIn, setIsLoggedIn] = useSessionStorage("logged", false);

  const handleLogout = async () => {
    try {
      const refreshToken = sessionStorage.getItem("refreshToken");
      await apiClient.post("/auth/logout", { refreshToken });
    } catch (error) {
      console.error("Error during logout:", error);
    }

    sessionStorage.clear();
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        <Route path='/' element={<Login setIsLoggedIn={setIsLoggedIn} />} />
        <Route
          path='/tasks'
          element={
            isLoggedIn ? (
              <Tasks handleLogout={handleLogout} />
            ) : (
              <div>
                <h2>Access Denied</h2>
                <p>Please log in to access the tasks page.</p>
              </div>
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
