import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableColumn, 
  TableRow, 
  TableCell, 
  Pagination,
} from "@nextui-org/react";
import {Select, SelectItem} from "@nextui-org/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
  token: string;
}

const SERVICE_AGGREGATION_MODE = 'service';

const LogViewer: React.FC<Props> = ({token}) => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [totalPages, setTotalPages] = useState();
  const [aggregationMode, setAggregationMode] = useState(SERVICE_AGGREGATION_MODE);
  const [aggregatedData, setAggregatedData] = useState([]);

  const fetchLogs = async () => {
    const response = await fetch('/logs',
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ page }),
        method: 'POST',
      }
    );
    const data = await response.json();
    setLogs(data.logs);
    setTotalPages(data.totalPages);
  };

  const fetchAggregatedData = async () => {
    const response = await fetch('/logs/aggregate',
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ groupBy: aggregationMode }),
        method: 'POST',
      }
    );
    const data = await response.json();
    setAggregatedData(data);
  };

  useEffect(() => {
    fetchLogs();
    fetchAggregatedData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, aggregationMode]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('logfile', file);
    setMessage('uploading..');
    const response = await fetch('/upload', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      method: 'POST',
      body: formData
    });

    const res = await response.json();
    if (res.error) {
      let errorMessage = res.error.message || res.error.name;
      if (res.invalidEntries) {
        errorMessage += `; ${res.invalidEntries} invalid entries!`;
      }
      if (res.error.issues && res.error.issues.length > 0) {
        errorMessage += `; ${res.error.issues[0].message} ${res.error.issues[0].path.toString()}`;
      }
      if (!errorMessage) {
        errorMessage = res.stack;
      }
      setMessage(errorMessage);
    } else {
      window.location.href = '/';
    }
  };

  const handlePageChange = (value) => {
    setPage(value);
  };

  return (
    <div className="p-4">
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload} 
      />
      {message}
      <Pagination initialPage={page} total={totalPages} onChange={handlePageChange}/>
      <Table isStriped>
        <TableHeader>
          <TableColumn>Timestamp</TableColumn>
          <TableColumn>Service</TableColumn>
          <TableColumn>Level</TableColumn>
          <TableColumn>Message</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No logs to display."}>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.timestamp}</TableCell>
              <TableCell>{log.service}</TableCell>
              <TableCell>{log.level}</TableCell>
              <TableCell>{log.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Select 
        label="Aggregation Mode" 
        value={aggregationMode}
        onChange={(e) => setAggregationMode(e.target.value)}
      >
        <SelectItem key="service">Service</SelectItem>
        <SelectItem key="level">Level</SelectItem>
        <SelectItem key="message">Message</SelectItem>
      </Select>
      <BarChart width={600} height={300} data={aggregatedData}>
        <XAxis dataKey={aggregationMode} />
        <YAxis />
        <Tooltip />
        <Bar stackId="amClass" dataKey="count" fill="#8884d8" />
        {aggregationMode === SERVICE_AGGREGATION_MODE && <Bar stackId="amClass" dataKey="error_count" fill="#d88884"/>}
      </BarChart>
    </div>
  );
};

export default LogViewer;
