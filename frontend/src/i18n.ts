const strings = {
    auth: {
      login: "Login",
      register: "Register",
      password_label: "Password",
      login_submit: "Log in",
      login_submitting: "Logging in…",
      register_submitting: "Registering…",
      register_failed: "Registration failed"
    },
  
    home: {
      title: "Optimization Form",
      dimension: "Dimension",
      instance_id: "Instance ID",
      n_iter: "Number of Iterations",
      seed: "Random Seed",
      algorithm: "Algorithm",
      submit: "Submit",
      submitting: "Submitting…",
      cached_results_title: "These results already exist",
      cached_id: "ID:",
      expected_actual: "Expected / Actual:",
      best_result: "Best result:",
      view: "View",
      download_csv: "Download CSV",
      close: "Close",
      run_anyway: "Run anyway"
    },
  
    resultsHistory: {
      title: "Your Request History",
      loading: "Loading…",
      error: "Error loading history",
      table: {
        id: "Date",
        algorithm: "Algorithm",
        budget: "Budget",
        action: "Action",
        no_requests: "No requests"
      },
      details: "Details",
      prev: "← Back",
      next: "Next →",
      page: "Page"
    },
  
    submitResult: {
      not_specified: "not specified",
      container_logs: "Container Logs",
      back: "Back to Home",
      view_result: "View Result",
      waiting: "Waiting for completion…",
      log_error: "Failed to retrieve logs.",
      finished_message: "Container has finished execution"
    },
  
    resultDetails: {
      error_loading: "Error loading result.",
      request_error_prefix: "Request error: ",
      server_unsuccessful: "Server returned unsuccessful response",
      back: "Back to Home",
      spinner: "Loading…"
    },
  
    dashboard: {
      management_title: "Manage Algorithms",
      add_button: "Add Algorithm",
      delete_confirm: "Delete method?",
      table: {
        id: "ID",
        name: "Name",
        path: "Path",
        parameters: "Parameters",
        actions: "Actions",
        no_methods: "No methods"
      },
      modal: {
        title: "New Algorithm",
        method_name_label: "Method Name",
        files_label: "Algorithm Files",
        add_file: "+ Add File",
        parameters_label: "Parameters",
        add_parameter: "+ Add Parameter",
        cancel: "Cancel",
        submit: "Submit",
        enter_method_name: "Enter method name"
      },
      alerts: {
        deletion_error: "Error deleting: ",
        creation_error: "Error creating: "
      }
    },
  
    files: {
      title: "File Management",
      current_path: "Current path:",
      up: "Up",
      new_folder_placeholder: "New folder",
      create_folder: "Create Folder",
      uploading: "Uploading…",
      upload: "Upload",
      table: {
        name: "Name",
        type: "Type",
        actions: "Actions"
      },
      type: {
        folder: "Folder",
        file: "File"
      },
      download: "Download",
      delete: "Delete",
      empty: "Empty",
      loading: "Loading…",
      enter_folder_name: "Enter folder name",
      error_loading_list: "Error loading list: ",
      error_create_folder: "Failed to create folder: ",
      error_upload_file: "Error uploading file: ",
      error_download: "Error downloading: ",
      error_delete: "Error deleting: "
    },
  
    exit: {
      title: "Logout",
      message: "Logging out…"
    }
  };
  
  export default strings;
  