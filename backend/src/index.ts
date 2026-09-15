import express, { type Request, type Response } from "express";
import cors from "cors";
import "dotenv/config";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", router);

app.get("/", (_request: Request, response: Response) => {
  response.status(200).json({
    message: "Barbershop API is running",
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
