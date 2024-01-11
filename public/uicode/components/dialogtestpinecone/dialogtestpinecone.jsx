import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import FormControl from 'react-bootstrap/FormControl';
import {
    getAuth,
} from "firebase/auth";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    where,
    limit,
    getDoc,
    getDocs,
    onSnapshot,
    getCountFromServer,
    query,
    orderBy,
    getFirestore,
    startAfter,
    documentId,
} from "firebase/firestore";
import {
    encode,
} from "gpt-tokenizer";

export default function DialogTestPinecone(props) {
    const [show, setShow] = React.useState(false);
    const [prompt, setPrompt] = React.useState("");
    const [pineconeResults, setPineconeResults] = React.useState([]);
    const tableFields = ["similarity", "id", "url", "title", "text", "copy", "size", "encodingCredits"];

    props.setShow = setShow;

    const handleClose = () => setShow(false);
    const handleQuery = async () => {
        let queryResults = await props.queryEmbeddings(prompt);
        setPineconeResults(queryResults);
    };

    const updateQueriedDocumentList = () => {
        let fileContent = "<table class=\"query_result_documents_list\">";
        fileContent += "<tr>";
        fileContent += `<th>row</th>`;
        keys.forEach((key) => fileContent += `<th>${key}</th>`);
        fileContent += "</tr>";

        this.queryDocumentsResultRows.forEach((row, index) => {
            fileContent += "<tr>";
            fileContent += `<th>${index + 1}</th>`;
            const newRow = {};
            keys.forEach((key) => {
                let value = row.metadata[key];
                const rawValue = value;
                value = BaseApp.escapeHTML(value);
                if (key === "id") value = row.id;
                if (key === "similarity") value = row.score;
                if (key === "encodingCredits") value = rawValue.toString().substring(0, 6);
                if (key === "size") value = row.metadata.text.length;
                if (key === "url") value = `<a href="${rawValue}" target="_blank">${rawValue}</a>`;
                if (key === "copy") {
                    value = `<i class="material-icons">content_copy</i>`;
                }
                fileContent += `<td class="table_cell_sizer"><div>${value}</div></td>`;
                newRow[key] = value;
            });
            fileContent += "</tr>";
        });

        fileContent += `</table>`;
        /*
        this.embedding_query_results_table_wrapper.innerHTML = fileContent;
        this.embedding_query_results_table_wrapper.querySelectorAll(".doc_text_copy_btn").forEach((btn: any) => {
            btn.addEventListener("click", () => {
                const index = btn.dataset.index;
                const row = this.queryDocumentsResultRows[index];
                navigator.clipboard.writeText(row.metadata.text);
            });
        });
        */
/*
        let primedPrompt = "";
        resultRows.forEach((row: any) => {
            const text = row.metadata.text;
            primedPrompt += "Question: " + query +
                "\n\nAnswer: " + text + "\n\n";
        });
        primedPrompt += "Question: " + query;
*/
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
                            <td>{row.metadata.text.length}</td>
                            <td>{row.metadata["encodingCredits"].toString().substring(0, 6)}</td>                            
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