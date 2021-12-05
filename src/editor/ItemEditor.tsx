import React from "react";
import "./ItemEditor.css";

export type ItemEditorDataEntry = [string, string];
export type ItemEditorData = ItemEditorDataEntry[];

interface ItemEditorProps {
  data: ItemEditorData;
  onModify: (field: string, value: string) => void;
};

interface ItemEditorState {
  error: {
    field: string | null;
    message: string;
  } | null;
};

export class EditError extends Error {}

export default class ItemEditor extends React.Component<ItemEditorProps, ItemEditorState> {
  constructor(props: ItemEditorProps) {
    super(props);
    this.state = { error: null };
    this.modifyHandler = this.modifyHandler.bind(this);
  }

  modifyHandler(field: string, value: string) {
    try {
      this.props.onModify(field, value);
      this.setState({ error: null });
    } catch (err: any) {
      this.setState({ error: { field, message: err.message} });
      if (!(err instanceof EditError))
        console.error(err);
    }
  }

  render() {
    const { props: { data: item }, state } = this;
    return (
      <div className="ItemEditor">
        <div>
          <strong>Selected Item</strong>
        </div>
        <div className="fields">
          {item.map(([field, value]) =>
            <div key={field} className="field">
              <span className="key">{field}</span>
              <input type="text" value={value}
                className={state.error?.field === field ? 'error' : ''}
                onInput={evt => this.modifyHandler(field, evt.currentTarget.value)} />
            </div>
          )}
        </div>
        <div>
          <span style={{ fontSize: "smaller" }}>{state.error?.message}</span>
        </div>
      </div>
    );
  }
}