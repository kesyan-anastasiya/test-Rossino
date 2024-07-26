const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Функция для поиска подстроки в последних N строках файла
async function searchSubstringInLastNLines(filePath, substring, numberOfLines) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        return reject(err);
      }

      const fileSize = stats.size;
      const bufferSize = 1024;
      const buffer = Buffer.alloc(bufferSize);
      let lastLines = '';
      let position = fileSize;
      let linesCount = 0;

      const readNextChunk = (fd) => {
        if (position <= 0 || linesCount >= numberOfLines) {
          const results = lastLines.split('\n')
            .slice(-numberOfLines)
            .filter(line => line.includes(substring));
          console.log(`Results: ${JSON.stringify(results)}`); // Вывод результатов
          return resolve(results);
        }

        const chunkSize = Math.min(bufferSize, position);
        position -= chunkSize;

        fs.read(fd, buffer, 0, chunkSize, position, (err, bytesRead) => {
          if (err) {
            return reject(err);
          }

          const chunk = buffer.toString('utf8', 0, bytesRead);
          lastLines = chunk + lastLines;
          linesCount += (chunk.match(/\n/g) || []).length;

          console.log(`Chunk: ${chunk}`); // Отладочное сообщение
          console.log(`Position: ${position}, LinesCount: ${linesCount}`); // Отладочное сообщение

          readNextChunk(fd);
        });
      };

      fs.open(filePath, 'r', (err, fd) => {
        if (err) {
          return reject(err);
        }

        readNextChunk(fd);
      });
    });
  });
}

// Endpoint для поиска подстроки
app.get('/search', async (req, res) => {
  const { query: substring, limit } = req.query;
  const numberOfLines = parseInt(limit, 10);
  const filePath = path.join(__dirname, 'test.log');

  console.log(`Query: ${substring}, Limit: ${numberOfLines}`); // Запрошенные параметры

  if (!substring || isNaN(numberOfLines)) {
    return res.status(400).send('Missing required query parameters: query and limit');
  }

  try {
    const results = await searchSubstringInLastNLines(filePath, substring, numberOfLines);
    res.json(results);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});