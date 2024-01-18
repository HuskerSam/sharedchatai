import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import FormControl from 'react-bootstrap/FormControl';

export default function DialogTestPinecone(props) {
    const [show, setShow] = React.useState(false);
    const [prompt, setPrompt] = React.useState("");
    const [pineconeResults, setPineconeResults] = React.useState([]);
    const tableFields = ["similarity", "id", "url", "title", "text", "copy"];

    props.setShow = setShow;

    const handleClose = () => setShow(false);
    const handleQuery = async () => {
        let queryResults = await props.queryEmbeddings(prompt);
        setPineconeResults(queryResults);
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton className="theme_panel">
                <Modal.Title>Test Pinecone</Modal.Title>
            </Modal.Header>
            <Modal.Body className="theme_panel">
                <FormControl as="textarea" onChange={(e) => setPrompt(e.target.value) }></FormControl>
                <div style={{ textAlign: "right", lineHeight: "3.5em" }}>
                    (top K = 10)
                    <Button variant="secondary" onClick={handleQuery}>Retrieve Documents</Button>
                </div>
                <div class="embedding_query_results_table_wrapper styled_csv_table" style={{ marginTop: "8px" }}>
                <table>
                    <tr>
                    {
                    tableFields.map((fieldName) => (
                        <th key={fieldName}>{fieldName}</th>
                    ))
                    }
                    </tr>
                    {pineconeResults.map((row) => (
                        <tr key={row.id}>
                            <td>{row.score}</td>
                            <td>{row.id}</td>
                            <td>{row.metadata["url"]}</td>
                            <td>{row.metadata["title"]}</td>
                            <td className="table_cell_sizer"><div>{row.metadata["text"]}</div></td>
                            <td onClick={() => navigator.clipboard.writeText(row.metadata.text)}>
                                <i class="material-icons">content_copy</i>
                            </td>                         
                        </tr>
                    ))}
                </table>
                </div>
            </Modal.Body>
            <Modal.Footer className="theme_panel">
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}