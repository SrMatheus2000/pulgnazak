import { Chip, CircularProgress, FilledInput, IconButton, TextField } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import useAutocomplete from '@mui/material/useAutocomplete';
import clsx from 'clsx';
import { produce } from 'immer';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MdAttachment, MdClear } from 'react-icons/md';

const useStyles = makeStyles(_theme => ({
  tag: {
    margin: 3,
    maxWidth: 'calc(100% - 6px)',
  },
  inputRoot: {
    flexWrap: 'wrap',
    '$hasPopupIcon &, $hasClearIcon &': {
      paddingRight: 26 + 4,
    },
    '$hasPopupIcon$hasClearIcon &': {
      paddingRight: 52 + 4,
    },
    '& $input': {
      width: 0,
      minWidth: 30,
    },
    '&[class*="MuiInput-root"]': {
      paddingBottom: 1,
      '& $input': {
        padding: 4,
      },
      '& $input:first-child': {
        padding: '6px 0',
      },
    },
    '&[class*="MuiOutlinedInput-root"]': {
      padding: 9,
      paddingRight: 26 + 4 + 9,
      '$hasClearIcon &': {
        paddingRight: 52 + 4 + 9,
      },
      '& $input': {
        padding: '9.5px 4px',
      },
      '& $input:first-child': {
        paddingLeft: 6,
      },
      '& $endAdornment': {
        right: 9,
      },
    },
    '&[class*="MuiOutlinedInput-root"][class*="MuiOutlinedInput-marginDense"]': {
      padding: 6,
      '& $input': {
        padding: '4.5px 4px',
      },
    },
  },
  input: {
    flexGrow: 1,
    textOverflow: 'ellipsis',
    opacity: 0,
  },
  inputFocused: {
    opacity: 1,
  },
  clearIndicator: {
    marginRight: -2,
    padding: 4,
    visibility: 'hidden',
  },
  clearIndicatorDirty: {},
  root: {
    display: 'flex',
    flexGrow: 1,
    '&$focused $clearIndicatorDirty': {
      visibility: 'visible',
    },
    '@media (pointer: fine)': {
      '&:hover $clearIndicatorDirty': {
        visibility: 'visible',
      },
    },
  },
  loading: {},
  endAdornment: {
    position: 'absolute',
    right: 0,
    top: 'calc(50% - 24px)',
    '$loading &': {
      top: 'calc(50% - 14px)',
    },
  },
  rename: {
    borderRadius: 10,
    padding: '5px !important'
  }
}));

const FilePreparer = ({
  onChange,
  TextFieldProps,
  placeholder,
  label,
  multiple,
  ChipProps,
  disabled,
  fileInputProps,
  valuePlaceHolder,
  concat,
  initialFiles = [],
  ...props
}, ref) => {
  const classes = useStyles();
  const inputRef = useRef();

  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState(initialFiles);

  const [motivo, setMotivo] = useState();

  useEffect(() => {
    if (valuePlaceHolder && !multiple) setFiles(f => [{ ...f[0], name: valuePlaceHolder }]);
  }, [valuePlaceHolder, multiple]);

  const preparaArquivo = useCallback(async file => {
    if (!file) return;
    setLoading(true);
    let reqs = [];
    if (file.map) reqs = file;
    else for (const f of file) reqs.push(f);
    setFiles(f => concat && multiple ? ([...f, ...reqs]) : reqs);
    setLoading(false);

    onChange && onChange(multiple ? concat ? [...files, ...reqs] : reqs : reqs[0], motivo);
  }, [concat, files, motivo, multiple, onChange]);

  useImperativeHandle(ref, () => ({ preparaArquivo, loading, setLoading }), [preparaArquivo, loading]);

  const handleChange = (_, v, reason) => {
    setMotivo(reason);
    inputRef.current.value = '';
    setFiles(v || []);

    onChange && onChange(multiple ? v || [] : (v || [])[0], motivo);
  };

  const {
    getInputProps,
    getTagProps,
    setAnchorEl,
    focusedTag,
    getClearProps,
    dirty
  } = useAutocomplete({
    value: files,
    inputValue: files.length ? '' : placeholder || 'Selecione um arquivo',
    options: [],
    onChange: handleChange,
    multiple: true,
    componentName: 'FilePreparer'
  });

  const [editando, setEditando] = useState();

  const handleEditing = index => e => {
    e.stopPropagation();
    if (files[index].idRecebimento) setEditando(index);
  };

  const handleRename = e => {
    setFiles(produce(file => void (file[editando].name = e.target.value)));
    setEditando(undefined);
  };

  const handleClick = () => !loading && !files.length && !disabled && inputRef.current.click();

  return (
    <div className={clsx(classes.root, { [classes.loading]: loading })} {...props}>
      <input ref={inputRef} type='file' {...{ multiple }} onChange={e => e?.target?.files?.length && preparaArquivo(e.target.files)} style={{ display: 'none' }} accept='application/x-x509-ca-cert,application/x-x509-user-cert' {...fileInputProps} />
      <TextField
        ref={setAnchorEl}
        variant='outlined'
        label={label || 'Arquivo'}
        margin='dense'
        onClick={handleClick}
        style={{ flexGrow: '1' }}
        InputProps={{
          readOnly: true,
          startAdornment: files.length > 0 ?
            files.map((option, index) => editando === index ? (
              <FilledInput className={classes.rename} defaultValue={option.name} autoFocus onBlur={handleRename} multiline disableUnderline />
            ) : (
              <Chip
                className={clsx(classes.tag)}
                label={option.name}
                onClick={handleEditing(index)}
                clickable
                {...{ disabled, ...ChipProps }}
                {...getTagProps({ index })}
              />
            )) : undefined,
          className: classes.inputRoot,
          endAdornment: <div className={classes.endAdornment}>
            {loading ? <CircularProgress disableShrink size={24} /> : <>
              <IconButton
                disabled={disabled}
                {...getClearProps()}
                className={clsx(classes.clearIndicator, {
                  [classes.clearIndicatorDirty]: dirty,
                })}
                size="large">
                <MdClear />
              </IconButton>
              <IconButton
                disabled={disabled}
                onClick={e => {
                  e.stopPropagation();
                  inputRef.current.click();
                }}
                size="large">
                <MdAttachment />
              </IconButton>
            </>}
          </div>
        }}
        inputProps={{
          className: clsx(classes.input, {
            [classes.inputFocused]: focusedTag === -1,
          }), disabled, ...getInputProps()
        }}
        {...TextFieldProps} />
    </div>
  );
};

export default forwardRef(FilePreparer);